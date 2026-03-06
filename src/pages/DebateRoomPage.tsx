import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, Users, Eye, Mic, Clock,
  ChevronRight, Send, MessageSquare, Zap, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import EditWindowBanner from "@/components/debate/EditWindowBanner";
import EditableArgument from "@/components/debate/EditableArgument";

type ViewMode = "facilitator" | "participant" | "audience";

interface DebateData {
  id: string;
  topic: string;
  status: string;
  created_by: string;
  time_per_turn: string;
  turns_per_subtopic: number;
  current_subtopic_index: number;
  current_turn: number;
  current_speaker_side_id: string | null;
  is_public: boolean;
  edit_window_ends_at: string | null;
  ended_at: string | null;
}

interface Side {
  id: string;
  label: string;
  sort_order: number;
}

interface Subtopic {
  id: string;
  title: string;
  sort_order: number;
}

interface Argument {
  id: string;
  content: string;
  argument_type: string;
  participant_id: string;
  subtopic_id: string;
  created_at: string;
  is_edited: boolean;
  original_content: string | null;
  edited_at: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  side_id: string | null;
}

function parseTimeToSeconds(t: string): number {
  if (t.includes("min")) return parseInt(t) * 60;
  if (t.includes("s")) return parseInt(t);
  return 120;
}

const DebateRoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [debate, setDebate] = useState<DebateData | null>(null);
  const [sides, setSides] = useState<Side[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [arguments_, setArguments] = useState<Argument[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("audience");
  const [loading, setLoading] = useState(true);

  // Turn state
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Input
  const [argumentText, setArgumentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // AI facilitator messages
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Load debate data
  useEffect(() => {
    if (!id) return;

    const loadDebate = async () => {
      const [debateRes, sidesRes, subtopicsRes, argsRes, participantsRes] = await Promise.all([
        supabase.from("debates").select("*").eq("id", id).single(),
        supabase.from("debate_sides").select("*").eq("debate_id", id).order("sort_order"),
        supabase.from("debate_subtopics").select("*").eq("debate_id", id).order("sort_order"),
        supabase.from("arguments").select("*").eq("debate_id", id).order("created_at"),
        supabase.from("debate_participants").select("*").eq("debate_id", id),
      ]);

      if (debateRes.error || !debateRes.data) {
        toast.error("Debate not found");
        navigate("/");
        return;
      }

      setDebate(debateRes.data as unknown as DebateData);
      setSides(sidesRes.data || []);
      setSubtopics(subtopicsRes.data || []);
      setArguments(argsRes.data || []);
      setParticipants(participantsRes.data || []);

      // Determine view mode
      if (debateRes.data.created_by === user?.id) {
        setViewMode("facilitator");
      } else if (participantsRes.data?.some((p) => p.user_id === user?.id)) {
        setViewMode("participant");
      } else {
        setViewMode("audience");
      }

      setTimeLeft(parseTimeToSeconds(debateRes.data.time_per_turn));
      setLoading(false);
    };

    loadDebate();
  }, [id, user, navigate]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`debate-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "arguments", filter: `debate_id=eq.${id}` }, (payload) => {
        setArguments((prev) => [...prev, payload.new as Argument]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "arguments", filter: `debate_id=eq.${id}` }, (payload) => {
        setArguments((prev) => prev.map((a) => a.id === (payload.new as Argument).id ? (payload.new as Argument) : a));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "debates", filter: `id=eq.${id}` }, (payload) => {
        setDebate(payload.new as unknown as DebateData);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "debate_participants", filter: `debate_id=eq.${id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setParticipants((prev) => [...prev, payload.new as Participant]);
        } else if (payload.eventType === "DELETE") {
          setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as Participant).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Timer
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timeLeft]);

  const currentSubtopic = subtopics[debate?.current_subtopic_index ?? 0];
  const currentSide = sides.find((s) => s.id === debate?.current_speaker_side_id) || sides[0];
  const myParticipant = participants.find((p) => p.user_id === user?.id);
  const isMyTurn = myParticipant?.side_id === currentSide?.id && debate?.status === "live";
  const currentSubtopicArgs = arguments_.filter((a) => a.subtopic_id === currentSubtopic?.id);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const timerColor = timeLeft <= 10 ? "text-destructive" : timeLeft <= 30 ? "text-primary" : "text-foreground";

  // Facilitator actions
  const startDebate = async () => {
    if (!debate || !id) return;
    setAiLoading(true);

    // Set status to live
    await supabase
      .from("debates")
      .update({
        status: "live",
        started_at: new Date().toISOString(),
        current_subtopic_index: 0,
        current_turn: 0,
        current_speaker_side_id: sides[0]?.id,
      })
      .eq("id", id);

    // Get AI opening statement
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-facilitator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "opening_statement",
            payload: {
              topic: debate.topic,
              subtopics: subtopics.map((s) => s.title),
              sides: sides.map((s) => s.label),
            },
          }),
        }
      );

      if (!response.ok || !response.body) throw new Error("Stream failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { text += c; setAiMessage(text); }
          } catch {}
        }
      }
    } catch (err) {
      console.error("Opening statement error:", err);
      setAiMessage("Welcome to this debate. Let's begin with the first subtopic.");
    }

    setTimerRunning(true);
    setAiLoading(false);
  };

  const advanceTurn = async () => {
    if (!debate || !id) return;

    const currentSideIdx = sides.findIndex((s) => s.id === debate.current_speaker_side_id);
    let nextSideIdx = (currentSideIdx + 1) % sides.length;
    let nextTurn = debate.current_turn;
    let nextSubIdx = debate.current_subtopic_index;

    if (nextSideIdx === 0) {
      nextTurn += 1;
    }

    // Check if we've exhausted turns for this subtopic
    if (nextTurn >= debate.turns_per_subtopic) {
      nextSubIdx += 1;
      nextTurn = 0;
      nextSideIdx = 0;

      // Check if debate is over
      if (nextSubIdx >= subtopics.length) {
        const editWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("debates")
          .update({
            status: "completed",
            ended_at: new Date().toISOString(),
            edit_window_ends_at: editWindowEnd,
          })
          .eq("id", id);

        // Generate closing synthesis
        setAiLoading(true);
        try {
          const summaries = subtopics.map((st) => ({
            subtopic: st.title,
            summary: arguments_
              .filter((a) => a.subtopic_id === st.id)
              .map((a) => a.content)
              .join(" | "),
          }));

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-facilitator`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                action: "closing_synthesis",
                payload: { topic: debate.topic, roundSummaries: summaries },
              }),
            }
          );

          if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let text = "";
            let buf = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let nl: number;
              while ((nl = buf.indexOf("\n")) !== -1) {
                let line = buf.slice(0, nl);
                buf = buf.slice(nl + 1);
                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) continue;
                const json = line.slice(6).trim();
                if (json === "[DONE]") break;
                try {
                  const parsed = JSON.parse(json);
                  const c = parsed.choices?.[0]?.delta?.content;
                  if (c) { text += c; setAiMessage(text); }
                } catch {}
              }
            }
          }
        } catch (err) {
          console.error("Closing synthesis error:", err);
        }
        setAiLoading(false);
        return;
      }
    }

    await supabase
      .from("debates")
      .update({
        current_subtopic_index: nextSubIdx,
        current_turn: nextTurn,
        current_speaker_side_id: sides[nextSideIdx]?.id,
      })
      .eq("id", id);

    setTimeLeft(parseTimeToSeconds(debate.time_per_turn));
    setTimerRunning(true);

    // Get transition prompt from AI
    setAiLoading(true);
    try {
      const response = await supabase.functions.invoke("ai-facilitator", {
        body: {
          action: "advance_turn",
          payload: {
            topic: debate.topic,
            subtopic: subtopics[nextSubIdx]?.title,
            previousArguments: currentSubtopicArgs.slice(-3).map((a) => ({
              side: sides.find((s) => {
                const p = participants.find((p) => p.id === a.participant_id);
                return p?.side_id === s.id;
              })?.label || "Unknown",
              content: a.content,
            })),
            nextSide: sides[nextSideIdx]?.label,
          },
        },
      });
      if (response.data?.content) setAiMessage(response.data.content);
    } catch {}
    setAiLoading(false);
  };

  const submitArgument = async () => {
    if (!argumentText.trim() || !debate || !myParticipant || !currentSubtopic || submitting) return;
    setSubmitting(true);

    const { error } = await supabase.from("arguments").insert({
      debate_id: debate.id,
      content: argumentText.trim(),
      participant_id: myParticipant.id,
      subtopic_id: currentSubtopic.id,
      argument_type: "claim",
    });

    if (error) {
      toast.error("Failed to submit argument");
    } else {
      setArgumentText("");

      // Classify argument in background
      supabase.functions.invoke("ai-facilitator", {
        body: {
          action: "argument_map",
          payload: { content: argumentText.trim(), side: currentSide?.label },
        },
      }).then((res) => {
        if (res.data?.argument_type) {
          // Could update the argument type in DB here
        }
      });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading debate…</div>
      </div>
    );
  }

  if (!debate) return null;

  const isCompleted = debate.status === "completed";
  const isDraft = debate.status === "draft";
  const isLive = debate.status === "live";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground text-sm">← Back</button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground truncate max-w-md">{debate.topic}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                isLive ? "bg-green-500/20 text-green-400" : isDraft ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
              }`}>
                {debate.status}
              </span>
              <span>{participants.length} participants</span>
            </div>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
          {(debate.created_by === user?.id ? ["facilitator", "participant", "audience"] as ViewMode[] : ["participant", "audience"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "facilitator" ? <Shield className="w-3.5 h-3.5 inline mr-1" /> : v === "participant" ? <Mic className="w-3.5 h-3.5 inline mr-1" /> : <Eye className="w-3.5 h-3.5 inline mr-1" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Timer & Current subtopic bar */}
          {isLive && (
            <div className="border-b border-border bg-card/50 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className={`text-2xl font-display font-bold tabular-nums ${timerColor}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Subtopic {(debate.current_subtopic_index ?? 0) + 1}/{subtopics.length}</p>
                  <p className="text-sm font-semibold">{currentSubtopic?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  currentSide?.sort_order === 0 ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                }`}>
                  {currentSide?.label}'s turn
                </div>
                <span className="text-xs text-muted-foreground">
                  Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
                </span>
              </div>
            </div>
          )}

          {/* AI Facilitator message */}
          <AnimatePresence>
            {aiMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-primary/20 bg-primary/5 px-6 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-1">AI Facilitator</p>
                    <p className="text-sm text-foreground leading-relaxed">{aiMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit window banner */}
          {isCompleted && debate.edit_window_ends_at && (
            <EditWindowBanner
              editWindowEndsAt={debate.edit_window_ends_at}
              isParticipant={!!myParticipant}
            />
          )}

          {/* Arguments feed */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {isDraft && viewMode === "facilitator" && (
              <div className="text-center py-16">
                <h3 className="text-xl font-display font-bold mb-2">Ready to begin?</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {participants.length} participant{participants.length !== 1 ? "s" : ""} joined · {subtopics.length} subtopics · {debate.turns_per_subtopic} turns each
                </p>
                <button
                  onClick={startDebate}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {aiLoading ? "Starting…" : <><Play className="w-5 h-5" /> Start Debate</>}
                </button>
              </div>
            )}

            {isDraft && viewMode !== "facilitator" && (
              <div className="text-center py-16">
                <h3 className="text-xl font-display font-bold mb-2">Waiting for facilitator…</h3>
                <p className="text-muted-foreground text-sm">The debate will begin shortly.</p>
              </div>
            )}

            {(isLive || isCompleted) && subtopics.map((st) => {
              const stArgs = arguments_.filter((a) => a.subtopic_id === st.id);
              if (stArgs.length === 0 && st.id !== currentSubtopic?.id) return null;

              return (
                <div key={st.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-display font-semibold text-primary">{st.title}</h3>
                  </div>
                  <div className="space-y-2 pl-6">
                    {stArgs.map((arg) => {
                      const participant = participants.find((p) => p.id === arg.participant_id);
                      const side = sides.find((s) => s.id === participant?.side_id);
                      const isLeft = side?.sort_order === 0;
                      const isInEditWindow =
                        isCompleted &&
                        debate.edit_window_ends_at &&
                        new Date(debate.edit_window_ends_at).getTime() > Date.now();
                      const canEditThis =
                        isInEditWindow &&
                        participant?.user_id === user?.id;

                      return (
                        <EditableArgument
                          key={arg.id}
                          id={arg.id}
                          content={arg.content}
                          originalContent={arg.original_content}
                          isEdited={arg.is_edited}
                          argumentType={arg.argument_type}
                          sideLabel={side?.label || "Unknown"}
                          sideOrder={side?.sort_order ?? 0}
                          isLeft={!!isLeft}
                          canEdit={!!canEditThis}
                          onUpdate={(argId, newContent) => {
                            setArguments((prev) =>
                              prev.map((a) =>
                                a.id === argId
                                  ? {
                                      ...a,
                                      content: newContent,
                                      is_edited: true,
                                      original_content: a.original_content || a.content,
                                      edited_at: new Date().toISOString(),
                                    }
                                  : a
                              )
                            );
                          }}
                        />
                      );
                    })}
                    {stArgs.length === 0 && st.id === currentSubtopic?.id && (
                      <p className="text-sm text-muted-foreground italic">Awaiting arguments…</p>
                    )}
                  </div>
                </div>
              );
            })}

            {isCompleted && (
              <div className="text-center py-8">
                <h3 className="text-xl font-display font-bold text-primary mb-2">Debate Complete</h3>
                <p className="text-muted-foreground text-sm">
                  {debate.edit_window_ends_at && new Date(debate.edit_window_ends_at).getTime() > Date.now()
                    ? "Participants may edit their arguments before the record is finalized."
                    : "The debate record is permanently finalized."}
                </p>
              </div>
            )}
          </div>

          {/* Input area — participant view, live, and it's their turn */}
          {isLive && viewMode === "participant" && isMyTurn && (
            <div className="border-t border-border bg-card px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={argumentText}
                  onChange={(e) => setArgumentText(e.target.value)}
                  placeholder="Type your argument…"
                  rows={2}
                  className="flex-1 bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitArgument(); }
                  }}
                />
                <button
                  onClick={submitArgument}
                  disabled={!argumentText.trim() || submitting}
                  className="bg-primary text-primary-foreground p-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {isLive && viewMode === "participant" && !isMyTurn && (
            <div className="border-t border-border bg-card/50 px-4 py-3 text-center text-sm text-muted-foreground">
              Waiting for {currentSide?.label} to respond…
            </div>
          )}

          {/* Facilitator controls */}
          {isLive && viewMode === "facilitator" && (
            <div className="border-t border-border bg-card px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setTimerRunning(!timerRunning); }}
                  className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {timerRunning ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => setTimeLeft(parseTimeToSeconds(debate.time_per_turn))}
                  className="bg-secondary rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Clock className="w-4 h-4 inline mr-1" /> Reset Timer
                </button>
              </div>
              <button
                onClick={advanceTurn}
                disabled={aiLoading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {aiLoading ? "Processing…" : <><SkipForward className="w-4 h-4" /> Next Turn</>}
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar — Argument map & participants */}
        <aside className="hidden lg:flex flex-col w-80 border-l border-border bg-card/50">
          {/* Participants */}
          <div className="border-b border-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Users className="w-3.5 h-3.5 inline mr-1" /> Participants ({participants.length})
            </h3>
            <div className="space-y-2">
              {sides.map((side) => (
                <div key={side.id}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    side.sort_order === 0 ? "text-blue-400" : "text-orange-400"
                  }`}>
                    {side.label}
                  </p>
                  {participants
                    .filter((p) => p.side_id === side.id)
                    .map((p) => (
                      <div key={p.id} className="text-xs text-foreground flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          side.sort_order === 0 ? "bg-blue-400" : "bg-orange-400"
                        }`} />
                        {p.user_id === user?.id ? "You" : p.user_id.slice(0, 8)}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Subtopic progress */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Subtopics
            </h3>
            <div className="space-y-2">
              {subtopics.map((st, i) => {
                const isCurrent = i === (debate?.current_subtopic_index ?? 0);
                const isDone = i < (debate?.current_subtopic_index ?? 0);
                const argCount = arguments_.filter((a) => a.subtopic_id === st.id).length;

                return (
                  <div
                    key={st.id}
                    className={`rounded-lg px-3 py-2 text-xs transition-colors ${
                      isCurrent ? "bg-primary/10 border border-primary/30 text-primary" :
                      isDone ? "bg-secondary/30 text-muted-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <p className="font-medium">{i + 1}. {st.title}</p>
                    {argCount > 0 && (
                      <p className="text-[10px] mt-0.5 opacity-75">{argCount} argument{argCount !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DebateRoomPage;
