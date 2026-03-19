import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, Share2, Copy, Check, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import EditWindowBanner from "@/components/debate/EditWindowBanner";
import EditableArgument from "@/components/debate/EditableArgument";
import MediaPermissions, { type MediaPermissionsHandle } from "@/components/debate/MediaPermissions";
import SpeechInput, { type SpeechInputHandle } from "@/components/debate/SpeechInput";
import FacilitatorView from "@/components/debate/FacilitatorView";
import ParticipantSharedView from "@/components/debate/ParticipantSharedView";
import AudienceView from "@/components/debate/AudienceView";

type UserRole = "facilitator" | "speaker" | "spectator";

interface DebateData {
  id: string;
  topic: string;
  status: string;
  created_by: string;
  facilitator_type: string;
  facilitator_user_id: string | null;
  time_per_turn: string;
  turns_per_subtopic: number;
  current_subtopic_index: number;
  current_turn: number;
  current_speaker_side_id: string | null;
  is_public: boolean;
  edit_window_ends_at: string | null;
  ended_at: string | null;
  join_code: string | null;
  turn_started_at: string | null;
}

interface Side { id: string; label: string; sort_order: number; }
interface Subtopic { id: string; title: string; sort_order: number; }
interface Argument {
  id: string; content: string; argument_type: string;
  participant_id: string; subtopic_id: string; created_at: string;
  is_edited: boolean; original_content: string | null; edited_at: string | null;
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

const DebateRoomPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [debate, setDebate] = useState<DebateData | null>(null);
  const [sides, setSides] = useState<Side[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [arguments_, setArguments] = useState<Argument[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState<UserRole>("spectator");
  const [facilitatorSpeaking, setFacilitatorSpeaking] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const [argumentText, setArgumentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const speechRef = useRef<SpeechInputHandle>(null);

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaRequested, setMediaRequested] = useState(false);
  const [autoAdvancePending, setAutoAdvancePending] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout>>();
  const prevTimerRunningRef = useRef(false);

  // Request media permissions at session start for non-spectators
  useEffect(() => {
    if (mediaRequested) return;
    if (userRole === "spectator") return;
    if (loading) return;

    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        // Stop tracks immediately — MediaPermissions component will manage the actual stream
        stream.getTracks().forEach((t) => t.stop());
        setMediaRequested(true);
      } catch (err) {
        console.warn("Media permission denied at session start:", err);
        setMediaRequested(true);
      }
    };
    requestPermissions();
  }, [userRole, loading, mediaRequested]);

  // Load data
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

      const d = debateRes.data as unknown as DebateData;
      const parts = (participantsRes.data || []) as unknown as Participant[];

      setDebate(d);
      setSides(sidesRes.data || []);
      setSubtopics(subtopicsRes.data || []);
      setArguments(argsRes.data || []);
      setParticipants(parts);

      // Creator defaults to speaker when AI is facilitator (Issue 2)
      if (d.facilitator_user_id && d.facilitator_user_id === user?.id) {
        setUserRole("facilitator");
      } else if (parts.some((p) => p.user_id === user?.id && p.participant_role === "speaker")) {
        setUserRole("speaker");
      } else {
        setUserRole("spectator");
      }

      // Compute synced timer from turn_started_at
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
    loadDebate();
  }, [id, user, navigate]);

  // Realtime
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
        const updated = payload.new as unknown as DebateData;
        setDebate(updated);
        // Sync timer from turn_started_at
        if (updated.turn_started_at && updated.status === "live") {
          const elapsed = Math.floor((Date.now() - new Date(updated.turn_started_at).getTime()) / 1000);
          const remaining = Math.max(0, parseTimeToSeconds(updated.time_per_turn) - elapsed);
          setTimeLeft(remaining);
          if (remaining > 0) setTimerRunning(true);
          else setTimerRunning(false);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "debate_participants", filter: `debate_id=eq.${id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setParticipants((prev) => [...prev, payload.new as unknown as Participant]);
        } else if (payload.eventType === "DELETE") {
          setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
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
          if (t <= 1) { setTimerRunning(false); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timeLeft]);

  // Auto-advance: when timer hits 0 during a live debate, advance immediately
  useEffect(() => {
    if (prevTimerRunningRef.current && !timerRunning && timeLeft === 0 && debate?.status === "live") {
      if (!advancingRef.current) {
        advanceTurn();
      }
    }
    prevTimerRunningRef.current = timerRunning;
  }, [timerRunning, timeLeft, debate]);

  const currentSubtopic = subtopics[debate?.current_subtopic_index ?? 0];
  const currentSide = sides.find((s) => s.id === debate?.current_speaker_side_id) || sides[0];
  const myParticipant = participants.find((p) => p.user_id === user?.id);
  const currentSubtopicArgs = arguments_.filter((a) => a.subtopic_id === currentSubtopic?.id);

  // Multi-speaker rotation: determine which specific speaker on the current side should speak
  const sideSpeakers = participants
    .filter((p) => p.side_id === currentSide?.id && p.participant_role === "speaker")
    .sort((a, b) => a.id.localeCompare(b.id)); // stable sort
  const currentSpeakerIndex = (debate?.current_turn ?? 0) % (sideSpeakers.length || 1);
  const activeSpeakerParticipant = sideSpeakers[currentSpeakerIndex];
  const isMyTurn = activeSpeakerParticipant?.user_id === user?.id && debate?.status === "live";

  const isCreator = user?.id === debate?.created_by;
  const isFacilitator = userRole === "facilitator";
  const isSpeaker = userRole === "speaker" || (isFacilitator && facilitatorSpeaking);
  const isSpectator = userRole === "spectator";
  const isCompleted = debate?.status === "completed";
  const isDraft = debate?.status === "draft";
  const isLive = debate?.status === "live";
  const canSpeak = isSpeaker && isMyTurn && isLive;
  const micEnabled = canSpeak;

  const advancingRef = useRef(false);

  // Fetch with retry + exponential backoff for 429s
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, options);
      if (response.status === 429 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random() * 500;
        console.warn(`AI rate limited (429), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return response;
    }
    throw new Error("Max retries exceeded");
  };

  // SSE stream helper
  const streamAI = async (action: string, payload: Record<string, unknown>) => {
    const response = await fetchWithRetry(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-facilitator`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action, payload }),
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
    return text;
  };

  const startDebate = async () => {
    if (!debate || !id) return;
    setAiLoading(true);
    const now = new Date().toISOString();
    await supabase.from("debates").update({
      status: "live", started_at: now, turn_started_at: now,
      current_subtopic_index: 0, current_turn: 0, current_speaker_side_id: sides[0]?.id,
    }).eq("id", id);

    try {
      await streamAI("opening_statement", {
        topic: debate.topic,
        subtopics: subtopics.map((s) => s.title),
        sides: sides.map((s) => s.label),
      });
    } catch {
      setAiMessage("Welcome to this debate. Let's begin with the first subtopic.");
    }
    setTimerRunning(true);
    setAiLoading(false);
  };

  const advanceTurn = async () => {
    if (!debate || !id || advancingRef.current) return;
    advancingRef.current = true;
    try {
      const currentSideIdx = sides.findIndex((s) => s.id === debate.current_speaker_side_id);
      let nextSideIdx = (currentSideIdx + 1) % sides.length;
      let nextTurn = debate.current_turn;
      let nextSubIdx = debate.current_subtopic_index;

      if (nextSideIdx === 0) nextTurn += 1;

      if (nextTurn >= debate.turns_per_subtopic) {
        nextSubIdx += 1;
        nextTurn = 0;
        nextSideIdx = 0;

        if (nextSubIdx >= subtopics.length) {
          const editWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          await supabase.from("debates").update({
            status: "completed", ended_at: new Date().toISOString(), edit_window_ends_at: editWindowEnd,
          }).eq("id", id);

          setAiLoading(true);
          try {
            const summaries = subtopics.map((st) => ({
              subtopic: st.title,
              summary: arguments_.filter((a) => a.subtopic_id === st.id).map((a) => a.content).join(" | "),
            }));
            await streamAI("closing_synthesis", { topic: debate.topic, roundSummaries: summaries });
          } catch {}
          setAiLoading(false);
          return;
        }
      }

      const turnNow = new Date().toISOString();
      await supabase.from("debates").update({
        current_subtopic_index: nextSubIdx, current_turn: nextTurn, current_speaker_side_id: sides[nextSideIdx]?.id, turn_started_at: turnNow,
      }).eq("id", id);

      setTimeLeft(parseTimeToSeconds(debate.time_per_turn));
      setTimerRunning(true);

      setAiLoading(true);
      try {
        await streamAI("advance_turn", {
          topic: debate.topic,
          subtopic: subtopics[nextSubIdx]?.title,
          previousArguments: currentSubtopicArgs.slice(-3).map((a) => ({
            side: sides.find((s) => { const p = participants.find((p) => p.id === a.participant_id); return p?.side_id === s.id; })?.label || "Unknown",
            content: a.content,
          })),
          nextSide: sides[nextSideIdx]?.label,
        });
      } catch {
        setAiMessage(`Now speaking: ${sides[nextSideIdx]?.label}`);
      }
      setAiLoading(false);
    } finally {
      advancingRef.current = false;
    }
  };

  const submitArgument = async () => {
    if (!argumentText.trim() || !debate || !myParticipant || !currentSubtopic || submitting) return;
    setSubmitting(true);
    speechRef.current?.stop();
    setIsRecording(false);
    const { error } = await supabase.from("arguments").insert({
      debate_id: debate.id, content: argumentText.trim(),
      participant_id: myParticipant.id, subtopic_id: currentSubtopic.id, argument_type: "claim",
    });
    if (error) {
      toast.error("Failed to submit argument");
    } else {
      setArgumentText("");
      supabase.functions.invoke("ai-facilitator", {
        body: { action: "argument_map", payload: { content: argumentText.trim(), side: currentSide?.label } },
      });
    }
    setSubmitting(false);
  };

  const copyJoinLink = () => {
    if (!debate?.join_code) return;
    const link = `${window.location.origin}/join/${debate.join_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Join link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFacilitatorSpeaker = async () => {
    if (!debate || !user || !id) return;
    if (facilitatorSpeaking) {
      await supabase.from("debate_participants").delete().eq("debate_id", id).eq("user_id", user.id);
      setFacilitatorSpeaking(false);
      toast.info("Returned to facilitator-only mode");
    } else {
      const existing = participants.find((p) => p.user_id === user.id);
      if (existing) {
        await supabase.from("debate_participants").update({ participant_role: "speaker" }).eq("id", existing.id);
        setFacilitatorSpeaking(true);
        toast.success("Joined as speaker");
      } else {
        const { error } = await supabase.from("debate_participants").insert({
          debate_id: id, user_id: user.id, side_id: sides[0]?.id, participant_role: "speaker",
        });
        if (!error) {
          setFacilitatorSpeaking(true);
          toast.success("Joined as speaker");
        }
      }
    }
  };

  const handleExtendTime = () => {
    setTimeLeft((t) => t + 60);
    toast.info("Extended by 1 minute");
  };

  const handleSkipTurn = () => {
    advanceTurn();
  };

  // Issue 4: End turn early
  const endTurnEarly = () => {
    setTimerRunning(false);
    setTimeLeft(0);
    setAutoAdvancePending(false);
    clearTimeout(autoAdvanceRef.current);
    advanceTurn();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-body">Loading debate…</div>
      </div>
    );
  }

  if (!debate) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground text-sm font-body">← Back</button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground truncate max-w-md">{debate.topic}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                isLive ? "bg-primary/20 text-primary" : isDraft ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
              }`}>
                {debate.status}
              </span>
              <span>{participants.length} participants</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                isFacilitator ? "bg-primary/20 text-primary" : isSpeaker ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {isFacilitator ? "Facilitator" : isSpeaker ? "Speaker" : "Spectator"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isFacilitator || isSpeaker) && user && (
            <MediaPermissions
              role={isFacilitator ? "facilitator" : "speaker"}
              isMicEnabled={micEnabled}
              userId={user.id}
              isActivelySpeaking={isRecording && canSpeak}
              variant="header"
            />
          )}

          {isCreator && (
            <div className="relative">
              <button
                onClick={() => setShowShare(!showShare)}
                className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
              {showShare && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-lg z-50">
                  <p className="text-xs text-muted-foreground mb-2 font-body">Share this link to invite speakers:</p>
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                    <code className="text-xs text-foreground flex-1 truncate">
                      {window.location.origin}/join/{debate.join_code}
                    </code>
                    <button onClick={copyJoinLink} className="text-primary hover:opacity-80">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-body">
                    Join code: <span className="font-mono font-bold text-foreground">{debate.join_code}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Draft views */}
        {isDraft && (
          <div className="flex-1 flex items-center justify-center">
            {isCreator ? (
              <div className="text-center py-16">
                <h3 className="text-xl font-display font-bold mb-2">Ready to begin?</h3>
                <p className="text-muted-foreground text-sm mb-4 font-body">
                  {participants.length} participant{participants.length !== 1 ? "s" : ""} joined · {subtopics.length} subtopics · {debate.turns_per_subtopic} turns each
                </p>
                {isFacilitator && (
                  <>
                    <button
                      onClick={toggleFacilitatorSpeaker}
                      className="mb-4 text-sm text-primary underline underline-offset-2 hover:opacity-80 font-body"
                    >
                      {facilitatorSpeaking ? "Leave speaker role" : "Join as Speaker"}
                    </button>
                    <br />
                  </>
                )}
                <button
                  onClick={startDebate}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 font-body"
                >
                  {aiLoading ? "Starting…" : <><Play className="w-5 h-5" /> Start Debate</>}
                </button>
              </div>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-xl font-display font-bold mb-2">Waiting for debate to start…</h3>
                <p className="text-muted-foreground text-sm font-body">The debate will begin shortly.</p>
              </div>
            )}
          </div>
        )}

        {/* Live views — role-based */}
        {isLive && isFacilitator && !facilitatorSpeaking && (
          <FacilitatorView
            debate={debate}
            sides={sides}
            subtopics={subtopics}
            arguments={arguments_}
            participants={participants}
            timeLeft={timeLeft}
            timerRunning={timerRunning}
            aiMessage={aiMessage}
            aiLoading={aiLoading}
            onToggleTimer={() => setTimerRunning(!timerRunning)}
            onResetTimer={() => setTimeLeft(parseTimeToSeconds(debate.time_per_turn))}
            onExtendTime={handleExtendTime}
            onSkipTurn={handleSkipTurn}
            onNextTurn={advanceTurn}
          />
        )}

        {isLive && (isSpeaker || (isFacilitator && facilitatorSpeaking)) && (
          <ParticipantSharedView
            debate={debate}
            sides={sides}
            subtopics={subtopics}
            arguments={arguments_}
            participants={participants}
            timeLeft={timeLeft}
            aiMessage={aiMessage}
            canSpeak={canSpeak}
            isMyTurn={!!isMyTurn}
            isSpeaker={isSpeaker}
            userId={user?.id}
            micEnabled={micEnabled}
            isRecording={isRecording}
            argumentText={argumentText}
            submitting={submitting}
            speechRef={speechRef}
            currentSide={currentSide}
            onArgumentTextChange={setArgumentText}
            onSetRecording={setIsRecording}
            onSubmit={submitArgument}
            onEndTurnEarly={endTurnEarly}
          />
        )}

        {isLive && isSpectator && (
          <AudienceView
            debate={debate}
            sides={sides}
            subtopics={subtopics}
            arguments={arguments_}
            participants={participants}
            timeLeft={timeLeft}
            aiMessage={aiMessage}
          />
        )}

        {/* Completed view */}
        {isCompleted && (
          <div className="flex-1 flex flex-col">
            {debate.edit_window_ends_at && (
              <EditWindowBanner
                editWindowEndsAt={debate.edit_window_ends_at}
                isParticipant={!!myParticipant}
              />
            )}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {subtopics.map((st) => {
                const stArgs = arguments_.filter((a) => a.subtopic_id === st.id);
                if (stArgs.length === 0) return null;
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
                        const isInEditWindow = debate.edit_window_ends_at && new Date(debate.edit_window_ends_at).getTime() > Date.now();
                        const canEditThis = isInEditWindow && participant?.user_id === user?.id;
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
                                    ? { ...a, content: newContent, is_edited: true, original_content: a.original_content || a.content, edited_at: new Date().toISOString() }
                                    : a
                                )
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="text-center py-8">
                <h3 className="text-xl font-display font-bold text-primary mb-2">Debate Complete</h3>
                <p className="text-muted-foreground text-sm font-body">
                  {debate.edit_window_ends_at && new Date(debate.edit_window_ends_at).getTime() > Date.now()
                    ? "Participants may edit their arguments before the record is finalized."
                    : "The debate record is permanently finalized."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar is now integrated into ParticipantSharedView */}
      </div>
    </div>
  );
};

export default DebateRoomPage;
