import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ChevronRight, Zap } from "lucide-react";
import DebateTimer from "@/components/debate/DebateTimer";

interface DebateData {
  id: string; topic: string; status: string;
  time_per_turn: string; turns_per_subtopic: number;
  current_subtopic_index: number; current_turn: number;
  current_speaker_side_id: string | null; turn_started_at: string | null;
}
interface Side { id: string; label: string; sort_order: number; }
interface Subtopic { id: string; title: string; sort_order: number; }
interface Argument {
  id: string; content: string; argument_type: string;
  participant_id: string; subtopic_id: string; created_at: string;
  is_edited: boolean; original_content: string | null;
  parent_argument_id: string | null;
}
interface Participant {
  id: string; user_id: string; side_id: string | null; participant_role: string;
}

function parseTimeToSeconds(t: string): number {
  if (t.includes("min")) return parseInt(t) * 60;
  if (t.includes("s")) return parseInt(t);
  return 120;
}

const AudiencePage = () => {
  const { id } = useParams<{ id: string }>();
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [sides, setSides] = useState<Side[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [args, setArgs] = useState<Argument[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [dRes, sRes, stRes, aRes, pRes] = await Promise.all([
        supabase.from("debates").select("*").eq("id", id).single(),
        supabase.from("debate_sides").select("*").eq("debate_id", id).order("sort_order"),
        supabase.from("debate_subtopics").select("*").eq("debate_id", id).order("sort_order"),
        supabase.from("arguments").select("*").eq("debate_id", id).order("created_at"),
        supabase.from("debate_participants").select("*").eq("debate_id", id),
      ]);
      if (!dRes.data) { setError("Debate not found."); setLoading(false); return; }
      const d = dRes.data as unknown as DebateData;
      setDebate(d);
      setSides(sRes.data || []);
      setSubtopics(stRes.data || []);
      setArgs(aRes.data || []);
      setParticipants((pRes.data || []) as unknown as Participant[]);

      if (d.turn_started_at && d.status === "live") {
        const elapsed = Math.floor((Date.now() - new Date(d.turn_started_at).getTime()) / 1000);
        const remaining = Math.max(0, parseTimeToSeconds(d.time_per_turn) - elapsed);
        setTimeLeft(remaining);
        if (remaining > 0) setTimerRunning(true);
      } else {
        setTimeLeft(parseTimeToSeconds(d.time_per_turn));
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`audience-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "arguments", filter: `debate_id=eq.${id}` }, (payload) => {
        setArgs((prev) => [...prev, payload.new as Argument]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "arguments", filter: `debate_id=eq.${id}` }, (payload) => {
        setArgs((prev) => prev.map((a) => a.id === (payload.new as Argument).id ? (payload.new as Argument) : a));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "debates", filter: `id=eq.${id}` }, (payload) => {
        const updated = payload.new as unknown as DebateData;
        setDebate(updated);
        if (updated.turn_started_at && updated.status === "live") {
          const elapsed = Math.floor((Date.now() - new Date(updated.turn_started_at).getTime()) / 1000);
          const remaining = Math.max(0, parseTimeToSeconds(updated.time_per_turn) - elapsed);
          setTimeLeft(remaining);
          if (remaining > 0) setTimerRunning(true);
          else setTimerRunning(false);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setTimerRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Loading…</p>
      </div>
    );
  }

  if (error || !debate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">{error || "Debate not found."}</p>
      </div>
    );
  }

  const currentSubtopic = subtopics[debate.current_subtopic_index ?? 0];
  const activeSide = sides.find((s) => s.id === debate.current_speaker_side_id) || sides[0];

  // Build arguments per subtopic
  const argsBySubtopic = (subtopicId: string) =>
    args.filter((a) => a.subtopic_id === subtopicId).map((a) => {
      const p = participants.find((p) => p.id === a.participant_id);
      const side = sides.find((s) => s.id === p?.side_id);
      return {
        id: a.id, content: a.content,
        sideLabel: side?.label || "Unknown",
        sideOrder: side?.sort_order ?? 0,
        isEdited: a.is_edited,
      };
    });

  if (debate.status === "draft" || debate.status === "scheduled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">{debate.topic}</h1>
          <p className="text-muted-foreground font-body">This debate hasn't started yet. Check back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-foreground truncate max-w-md">
              {debate.topic}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
              <Eye className="w-3.5 h-3.5" />
              <span>Watching as audience</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                debate.status === "live" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {debate.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DebateTimer timeLeft={timeLeft} size="md" />
          </div>
        </div>
      </header>

      {/* Speaker + subtopic bar */}
      <div className="border-b border-border bg-card/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">Speaking</p>
            <h2 className="text-xl font-display font-bold text-primary">
              {activeSide?.label}
            </h2>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1">
            <ChevronRight className="w-3 h-3 text-primary" />
            <span className="text-xs font-display font-semibold text-primary">
              {currentSubtopic?.title}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-body">
          Subtopic {(debate.current_subtopic_index ?? 0) + 1}/{subtopics.length} · Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
        </span>
      </div>

      {/* Live argument feed */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {subtopics.map((st, i) => {
            const stArgs = argsBySubtopic(st.id);
            if (stArgs.length === 0 && st.id !== currentSubtopic?.id) return null;
            const isCurrent = i === (debate.current_subtopic_index ?? 0);

            return (
              <div key={st.id}>
                <div className="flex items-center gap-2 mb-3">
                  <ChevronRight className={`w-3.5 h-3.5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 className={`text-xs font-display font-semibold uppercase tracking-wider ${
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {st.title}
                  </h3>
                </div>
                {stArgs.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body pl-5 italic">Awaiting arguments…</p>
                ) : (
                  <div className="space-y-2 pl-5">
                    <AnimatePresence initial={false}>
                      {stArgs.map((a) => {
                        const isSide1 = a.sideOrder === 0;
                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`w-full rounded-lg px-4 py-3 text-sm font-body border-l-4 break-words whitespace-pre-wrap ${
                              isSide1
                                ? "border-l-[hsl(var(--side-1))] bg-[hsl(var(--side-1)/0.08)]"
                                : "border-l-[hsl(var(--side-2))] bg-[hsl(var(--side-2)/0.08)]"
                            }`}
                          >
                            <p className={`text-[10px] font-semibold mb-1 ${
                              isSide1 ? "text-[hsl(var(--side-1))]" : "text-[hsl(var(--side-2))]"
                            }`}>
                              {a.sideLabel}
                              {a.isEdited && " · edited"}
                            </p>
                            <p className="leading-relaxed text-foreground">{a.content}</p>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card/50 px-4 py-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2 font-body">
        <Eye className="w-4 h-4" />
        You are watching as an audience member — read-only
      </div>
    </div>
  );
};

export default AudiencePage;
