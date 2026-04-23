import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Swords, Lock, Globe } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import QueueList from "@/components/cmm/QueueList";
import ChallengeComposer from "@/components/cmm/ChallengeComposer";
import EditSetupPanel from "@/components/cmm/EditSetupPanel";
import { useCmmQueue } from "@/hooks/useCmmQueue";
import { useCmmLiveCapture } from "@/hooks/useCmmLiveCapture";
import CmmLiveTranscript from "@/components/cmm/CmmLiveTranscript";
import { useGrading } from "@/hooks/useGrading";
import RecordToolsMount from "@/components/record/RecordToolsMount";

interface DebateRow {
  id: string;
  topic: string;
  created_by: string;
  is_public: boolean;
  status: string;
  format: string;
  grading_enabled: boolean;
  started_at: string | null;
}
interface Subtopic { id: string; title: string; sort_order: number; }
interface Side { id: string; label: string; }

const ChangeMyMindRoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [debate, setDebate] = useState<DebateRow | null>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [ownerSide, setOwnerSide] = useState<Side | null>(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastGradedActiveIdRef = useRef<string | null>(null);

  const { rows, refresh } = useCmmQueue(id);
  const { gradeTurn, gradeFinal } = useGrading();

  const activeRow = rows.find((r) => r.status === "active") || null;

  const challengerLabel = useMemo(
    () => activeRow?.display_name || "Challenger",
    [activeRow?.display_name],
  );

  const ownerLabel = useMemo(
    () => ownerSide?.label?.slice(0, 32) || "Owner",
    [ownerSide?.label],
  );

  const isOwnerEarly = !!user && !!debate && user.id === debate.created_by;
  const captureActive = !!activeRow && isOwnerEarly; // Owner-device captures shared mic.

  const { entries: liveEntries, interimText, isConnected, micError } = useCmmLiveCapture({
    debateId: id ?? null,
    active: captureActive,
    ownerLabel,
    challengerLabel,
  });

  const load = async () => {
    if (!id) return;
    const { data: d, error } = await supabase.from("debates").select("*").eq("id", id).maybeSingle();
    if (error || !d) {
      toast.error("Not found");
      navigate("/");
      return;
    }
    setDebate(d as any);
    const { data: subs } = await supabase
      .from("debate_subtopics")
      .select("id, title, sort_order")
      .eq("debate_id", id)
      .order("sort_order");
    setSubtopics((subs ?? []) as any);
    const { data: sides } = await supabase
      .from("debate_sides")
      .select("id, label, sort_order")
      .eq("debate_id", id)
      .order("sort_order");
    setOwnerSide(((sides ?? [])[0] as any) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // Auto-open challenge composer if arriving from invite (?challenge=1).
  useEffect(() => {
    if (!debate || !user) return;
    if (user.id === debate.created_by) return;
    if (searchParams.get("challenge") === "1") {
      setComposerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("challenge");
      setSearchParams(next, { replace: true });
    }
  }, [debate, user, searchParams, setSearchParams]);

  if (loading || !debate) {
    return <AppLayout><div className="max-w-xl mx-auto px-4 py-10 text-sm text-muted-foreground">Loading…</div></AppLayout>;
  }

  const isOwner = !!user && user.id === debate.created_by;
  const isPreLive = !debate.started_at;
  const myRow = rows.find((r) => r.user_id === user?.id && (r.status === "waiting" || r.status === "active"));

  const handleStartNext = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("cmm_start_next" as any, { _debate_id: debate.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    refresh();
    load();
  };

  const handleEndRound = async (outcome: "completed" | "skipped") => {
    // Snapshot challenger before we end the round so we can grade after.
    const ending = activeRow;
    setBusy(true);
    const { error } = await supabase.rpc("cmm_end_round" as any, { _debate_id: debate.id, _outcome: outcome });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    refresh();

    // Optional AI grading — fire-and-forget.
    if (debate.grading_enabled && outcome === "completed" && ending) {
      const ownerEntries = liveEntries.filter((e) => e.speaker_side === "owner").map((e) => e.text).join(" ").trim();
      const challengerEntries = liveEntries.filter((e) => e.speaker_side === "challenger").map((e) => e.text).join(" ").trim();

      try {
        // Resolve owner participant_id.
        const { data: ownerPart } = await supabase
          .from("debate_participants")
          .select("id")
          .eq("debate_id", debate.id)
          .eq("user_id", debate.created_by)
          .maybeSingle();
        const { data: challengerPart } = await supabase
          .from("debate_participants")
          .select("id, side_id")
          .eq("debate_id", debate.id)
          .eq("user_id", ending.user_id)
          .maybeSingle();

        const baseTopic = debate.topic;
        if (ownerPart && ownerEntries.length > 8) {
          await gradeTurn({
            debateId: debate.id, participantId: ownerPart.id, userId: debate.created_by,
            subtopicId: null, turnIndex: 0,
            topic: baseTopic, subtopic: baseTopic,
            side: ownerLabel, content: ownerEntries,
            opposingArguments: [{ side: ending.position_text, content: challengerEntries }],
            includeResolution: false,
          });
          await gradeFinal({
            debateId: debate.id, participantId: ownerPart.id, userId: debate.created_by,
            topic: baseTopic, side: ownerLabel,
            allTurns: [{ subtopic: baseTopic, content: ownerEntries }],
            opposingTurns: [{ subtopic: baseTopic, side: ending.position_text, content: challengerEntries }],
            includeResolution: false,
          });
        }
        if (challengerPart && challengerEntries.length > 8) {
          await gradeTurn({
            debateId: debate.id, participantId: challengerPart.id, userId: ending.user_id,
            subtopicId: null, turnIndex: 0,
            topic: baseTopic, subtopic: baseTopic,
            side: ending.position_text, content: challengerEntries,
            opposingArguments: [{ side: ownerLabel, content: ownerEntries }],
            includeResolution: false,
          });
          await gradeFinal({
            debateId: debate.id, participantId: challengerPart.id, userId: ending.user_id,
            topic: baseTopic, side: ending.position_text,
            allTurns: [{ subtopic: baseTopic, content: challengerEntries }],
            opposingTurns: [{ subtopic: baseTopic, side: ownerLabel, content: ownerEntries }],
            includeResolution: false,
          });
        }
        toast.success("Round graded.");
      } catch (err) {
        console.error("[cmm] grading failed", err);
      }
    }
  };

  const handleWithdraw = async (rowId: string) => {
    const { error } = await supabase.from("cmm_queue" as any).delete().eq("id", rowId);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5 pb-32" data-record-root>
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Swords className="w-3.5 h-3.5" />
            <span>Change My Mind</span>
            {debate.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl leading-tight">{debate.topic}</h1>
          {ownerSide && (
            <div className="rounded-xl border border-foreground/30 bg-foreground/[0.02] p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Owner's position</div>
              <p className="text-sm mt-1">{ownerSide.label}</p>
            </div>
          )}
        </div>

        {/* Subtopics */}
        {subtopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subtopics.map((s) => (
              <span key={s.id} className="text-xs px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground">
                {s.title}
              </span>
            ))}
          </div>
        )}

        {/* Pre-live edit banner for owner */}
        {isOwner && isPreLive && (
          <EditSetupPanel
            debateId={debate.id}
            topic={debate.topic}
            isPublic={debate.is_public}
            gradingEnabled={debate.grading_enabled}
            subtopics={subtopics}
            ownerSide={ownerSide}
            onChanged={load}
          />
        )}

        {/* Queue */}
        <QueueList
          rows={rows}
          isOwner={isOwner}
          meId={user?.id ?? null}
          onStartNext={handleStartNext}
          onEndRound={handleEndRound}
          onWithdraw={handleWithdraw}
          busy={busy}
        />

        {/* Live transcript — visible whenever a round is active */}
        {activeRow && (
          <CmmLiveTranscript
            entries={liveEntries}
            interimText={isOwner ? interimText : ""}
            isConnected={isOwner ? isConnected : true}
            micError={isOwner ? micError : null}
          />
        )}

        {/* Sticky CTA for non-owner */}
        {!isOwner && (
          <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3 bg-background/95 backdrop-blur border-t border-border z-40">
            <div className="max-w-xl mx-auto">
              {!user ? (
                <Button className="w-full" onClick={() => navigate("/auth")}>Sign in to challenge</Button>
              ) : myRow ? (
                <Button className="w-full" variant="outline" disabled>You're {myRow.status === "active" ? "live now" : `#${rows.filter(r=>r.status==="waiting").findIndex(r=>r.id===myRow.id)+1} in queue`}</Button>
              ) : (
                <Button className="w-full" onClick={() => setComposerOpen(true)}>
                  <Swords className="w-4 h-4" /> Challenge
                </Button>
              )}
            </div>
          </div>
        )}

        <ChallengeComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          debateId={debate.id}
          topic={debate.topic}
          onJoined={refresh}
        />
      </div>
      {user && (
        <RecordToolsMount
          recordType="change_my_mind"
          recordId={debate.id}
          transcriptEntries={liveEntries.map((e) => ({
            id: e.id,
            speaker_id: e.speaker_side === "owner" ? 0 : 1,
            speaker_label: e.speaker_label,
            text: e.text,
            timestamp: e.timestamp,
            is_final: true,
          }))}
          subtopics={subtopics.map((s) => s.title)}
        />
      )}
    </AppLayout>
  );
};

export default ChangeMyMindRoomPage;