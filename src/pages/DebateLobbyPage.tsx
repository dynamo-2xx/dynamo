import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import MicLobby from "@/components/lobby/MicLobby";
import InPersonJoinPanel from "@/components/create/InPersonJoinPanel";
import WaitingForHost from "@/components/lobby/WaitingForHost";
import QueuedSpeakerBubbles from "@/components/lobby/QueuedSpeakerBubbles";
import { useMicLobbyAttachment } from "@/hooks/useMicLobbyAttachment";
import { toast } from "sonner";

interface Side { id: string; label: string; sort_order: number; }

/**
 * Owner pre-live lobby for a Debate room. Shows the join code/QR, expected
 * slots per side, and gates Start on at least one connected mic.
 */
export default function DebateLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [maxPerSide, setMaxPerSide] = useState(2);
  const [sides, setSides] = useState<Side[]>([]);
  const [starting, setStarting] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [overdueMin, setOverdueMin] = useState<number>(0);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [queuedSideId, setQueuedSideId] = useState<string | null>(null);
  const [waitStream, setWaitStream] = useState<MediaStream | null>(null);
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);

  const isCreator = !!user && !!createdBy && user.id === createdBy;

  const deviceId = (typeof window !== "undefined")
    ? (localStorage.getItem("dyn_device_id") || (() => {
        const id = crypto.randomUUID();
        localStorage.setItem("dyn_device_id", id);
        return id;
      })())
    : "";

  // Non-creator queued users: attach mic to the lobby so the host sees them ready.
  useMicLobbyAttachment({
    kind: "debate",
    sessionId: !isCreator && user && id ? id : null,
    slotKey: !isCreator && user ? `queued:${user.id}` : null,
    userId: user?.id ?? null,
    deviceId,
    displayName: user?.email?.split("@")[0] || "Queued",
    mode: "own_mic",
    stream: waitStream,
  });

  // Host: attach own mic to lobby so the host appears in the seat list too.
  useMicLobbyAttachment({
    kind: "debate",
    sessionId: isCreator && id ? id : null,
    slotKey: isCreator && user ? `host:${user.id}` : null,
    userId: user?.id ?? null,
    deviceId,
    displayName: user?.email?.split("@")[0] || "Host",
    mode: "own_mic",
    stream: hostStream,
  });

  // Acquire mic for non-creator waiting view
  useEffect(() => {
    if (isCreator || !user) return;
    let active = true;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        setWaitStream(s);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [isCreator, user]);

  // Acquire mic for host so the green pulse + connection row works.
  useEffect(() => {
    if (!isCreator || !user) return;
    let active = true;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        setHostStream(s);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [isCreator, user]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: d } = await supabase
        .from("debates")
        .select("topic, join_code, max_speakers_per_side, created_by, status, scheduled_at")
        .eq("id", id)
        .maybeSingle();
      if (!d) {
        toast.error("Debate not found");
        navigate("/");
        return;
      }
      if (d.status === "live") {
        navigate(`/debate/${id}`, { replace: true });
        return;
      }
      setCreatedBy(d.created_by);
      setTopic(d.topic);
      setJoinCode(d.join_code);
      setMaxPerSide(d.max_speakers_per_side ?? 2);
      setScheduledAt((d as any).scheduled_at ?? null);
      const { data: s } = await supabase
        .from("debate_sides")
        .select("*")
        .eq("debate_id", id)
        .order("sort_order");
      setSides((s ?? []) as Side[]);

      // If this user has a queued interest for this debate, remember it.
      if (user && d.created_by !== user.id) {
        const { data: interest } = await supabase
          .from("debate_interests")
          .select("side_id, role")
          .eq("debate_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (interest?.role === "queued_speaker") {
          setQueuedSideId(interest.side_id ?? null);
        }
      }
    })();
  }, [id, user, navigate]);

  // Non-creator: redirect to debate room when host starts.
  useEffect(() => {
    if (isCreator || !id) return;
    const ch = supabase
      .channel(`lobby-watch-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "debates", filter: `id=eq.${id}` },
        (payload) => {
          const st = (payload.new as any).status;
          if (st === "live") navigate(`/debate/${id}`, { replace: true });
        },
      )
      .subscribe();
    // Poll fallback — covers the case where realtime is slow or the channel
    // attaches after the host has already flipped the status. Ensures every
    // queued speaker auto-joins within ~4s of the host pressing Start.
    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("debates")
        .select("status")
        .eq("id", id)
        .maybeSingle();
      if ((data as any)?.status === "live") {
        navigate(`/debate/${id}`, { replace: true });
      }
    }, 4000);
    return () => {
      supabase.removeChannel(ch);
      window.clearInterval(poll);
    };
  }, [isCreator, id, navigate]);

  // §4 owner no-show banner — surfaces +15m past scheduled start.
  useEffect(() => {
    if (!scheduledAt) { setOverdueMin(0); return; }
    const tick = () => {
      const diffMs = Date.now() - new Date(scheduledAt).getTime();
      setOverdueMin(Math.max(0, Math.floor(diffMs / 60000)));
    };
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, [scheduledAt]);

  const handleCancel = async () => {
    if (!id) return;
    const ok = window.confirm("Cancel this debate? Invitees will be notified.");
    if (!ok) return;
    const { error } = await supabase
      .from("debates")
      .update({ status: "archived", ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Debate cancelled");
    navigate("/", { replace: true });
  };


  const handleStart = async () => {
    if (!id) return;
    setStarting(true);

    // Promote ALL waiting speakers → debate_participants so the room admits
    // them when status flips to live. We MUST go through a SECURITY DEFINER
    // RPC because the participants INSERT policy only lets a user insert
    // their own row — a host-side upsert would be silently dropped for every
    // other speaker, leaving them stuck in the lobby. The RPC pulls from both
    // debate_interests (queued_speaker) and debate_invitations (accepted) and
    // dedupes by user_id.
    try {
      const { error: promoteErr } = await supabase.rpc(
        "promote_lobby_to_participants" as any,
        { _debate_id: id },
      );
      if (promoteErr) console.warn("Failed to promote queued speakers", promoteErr);
    } catch (e) {
      console.warn("Failed to promote queued speakers", e);
    }

    const { error } = await supabase
      .from("debates")
      .update({ status: "live", started_at: new Date().toISOString() })
      .eq("id", id);
    setStarting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(`/debate/${id}`, { replace: true });
  };

  const handleForceStart = async () => {
    if (!id) return;
    const ok = window.confirm(
      "Start without waiting for ready mics? Late participants will join when their mic connects.",
    );
    if (!ok) return;
    await handleStart();
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Lobby</p>
          <h1 className="font-display text-2xl text-foreground">{topic}</h1>
        </div>
        {isCreator && overdueMin >= 15 && (
          <div className="border border-foreground/10 rounded-lg p-3 bg-amber-50 text-sm font-body text-foreground flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">Running {overdueMin}m late</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start now, or cancel to free everyone's slot.</p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="shrink-0 text-xs underline underline-offset-2 hover:no-underline"
            >
              Cancel debate
            </button>
          </div>
        )}
        {isCreator ? (
          <>
            <InPersonJoinPanel
              debateId={id ?? null}
              joinCode={joinCode}
              maxSpeakersPerSide={maxPerSide}
              onMaxSpeakersChange={async (n) => {
                setMaxPerSide(n);
                if (id) await supabase.from("debates").update({ max_speakers_per_side: n }).eq("id", id);
              }}
              onCodeRegenerated={(c) => setJoinCode(c)}
            />
            <QueuedSpeakerBubbles debateId={id ?? null} sides={sides.map((s) => ({ id: s.id, label: s.label }))} hostUserId={createdBy} />
            <MicLobby
              kind="debate"
              sessionId={id ?? null}
              slots={[]}
              hideEmptySlots
              sides={sides.map((s) => ({ id: s.id, label: s.label }))}
              minConnected={1}
              onStart={handleStart}
              starting={starting}
              startLabel="Start debate"
              onForceStart={handleForceStart}
            />
          </>
        ) : (
          <>
            <QueuedSpeakerBubbles debateId={id ?? null} sides={sides.map((s) => ({ id: s.id, label: s.label }))} hostUserId={createdBy} />
            <WaitingForHost
              sessionTitle={topic}
              stream={waitStream}
              mode="own_mic"
              lockReason={
                queuedSideId
                  ? `Queued for ${sides.find((s) => s.id === queuedSideId)?.label ?? "a side"} — host can accept you`
                  : "Waiting for the host"
              }
              onLeave={() => navigate(`/debate/${id}/preview`, { replace: true })}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}