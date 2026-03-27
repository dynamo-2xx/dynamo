import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, Share2, Copy, Check, ChevronRight, ChevronDown, AlertCircle, Zap, NotebookPen
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
import DebateCompletionOverlay from "@/components/debate/DebateCompletionOverlay";
import RoundSummaryCard from "@/components/debate/RoundSummaryCard";
import PrepPhaseOverlay from "@/components/debate/PrepPhaseOverlay";
import { useDeepgramTranscription } from "@/hooks/useDeepgramTranscription";
import TranscriptCard from "@/components/debate/TranscriptCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  prep_time_min: string;
  prep_time_max: string;
  prep_phase_active: boolean;
  prep_phase_started_at: string | null;
  prep_duration_seconds: number | null;
  prep_side1_ready: boolean;
  prep_side2_ready: boolean;
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
  const [deepgramActive, setDeepgramActive] = useState(false);
  const speechRef = useRef<SpeechInputHandle>(null);

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaRequested, setMediaRequested] = useState(false);
  const prevTimerRunningRef = useRef(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [roundSummaries, setRoundSummaries] = useState<Record<string, { summary: string; key_arguments: Array<{ side: string; content: string; type: string; significance: string }> }>>({});
  const [prepPhaseRole, setPrepPhaseRole] = useState<"incoming" | "outgoing" | null>(null);
  const [prepStartedAt, setPrepStartedAt] = useState<number | null>(null);
  const [selectedPrepDuration, setSelectedPrepDuration] = useState<number | null>(null);
  const [lastTurnTranscript, setLastTurnTranscript] = useState<string>("");
  const [lastTurnSummary, setLastTurnSummary] = useState<string>("");
  const [notebookContent, setNotebookContent] = useState<string>("");
  const [notebookOpen, setNotebookOpen] = useState(false);

  // Deepgram transcription — activate for all non-spectators as soon as debate is live
  const currentSubtopicForTranscript = subtopics[debate?.current_subtopic_index ?? 0];
  const currentSideForTranscript = sides.find((s) => s.id === debate?.current_speaker_side_id) || sides[0];
  const {
    transcriptEntries,
    interimText,
    isConnected: deepgramConnected,
    micError,
    connectionError,
    addTextEntry,
  } = useDeepgramTranscription({
    debateId: id || "",
    currentSpeakerSide: currentSideForTranscript?.label || "",
    currentSubtopic: currentSubtopicForTranscript?.title || "",
    sides: sides.map((s) => s.label),
    isActive: debate?.status === "live" && userRole !== "spectator" && deepgramActive,
  });

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

      // Load round summaries for completed or live debates
      const { data: summariesData } = await supabase
        .from("round_summaries")
        .select("*")
        .eq("debate_id", id);
      if (summariesData) {
        const map: Record<string, { summary: string; key_arguments: Array<{ side: string; content: string; type: string; significance: string }> }> = {};
        summariesData.forEach((rs: any) => {
          map[rs.subtopic_id] = {
            summary: rs.summary,
            key_arguments: (rs.key_arguments as any[]) || [],
          };
        });
        setRoundSummaries(map);
      }

      // Show completion overlay if debate just completed (within last 30s)
      if (d.status === "completed" && d.ended_at) {
        const endedAgo = Date.now() - new Date(d.ended_at).getTime();
        if (endedAgo < 30000) setShowCompletionOverlay(true);
      }
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
        // Sync prep phase from other participant
        if (updated.prep_phase_active && !prepPhaseRole) {
          // The other side started prep — we need to enter prep too
          enterPrepPhaseFromRealtime(updated);
        }
        // Both sides ready → advance
        if (updated.prep_side1_ready && updated.prep_side2_ready && prepPhaseRole) {
          setPrepPhaseRole(null);
          setPrepStartedAt(null);
          setSelectedPrepDuration(null);
          // Clear prep flags on DB
          supabase.from("debates").update({
            prep_phase_active: false,
            prep_phase_started_at: null,
            prep_duration_seconds: null,
            prep_side1_ready: false,
            prep_side2_ready: false,
          } as any).eq("id", id);
          advanceTurn();
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

  // Auto-advance: when timer hits 0 during a live debate, enter prep phase
  useEffect(() => {
    if (prevTimerRunningRef.current && !timerRunning && timeLeft === 0 && debate?.status === "live") {
      if (!advancingRef.current && !prepPhaseRole) {
        enterPrepPhase();
      }
    }
    prevTimerRunningRef.current = timerRunning;
  }, [timerRunning, timeLeft, debate, prepPhaseRole]);

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
  const canSpeak = isSpeaker && isMyTurn && isLive && !prepPhaseRole;
  const micEnabled = canSpeak;

  const advancingRef = useRef(false);

  // Determine which side index (0 or 1) the current user is on
  const getMySideIndex = useCallback((): 0 | 1 => {
    if (!myParticipant || sides.length < 2) return 0;
    const sortedSides = [...sides].sort((a, b) => a.sort_order - b.sort_order);
    return myParticipant.side_id === sortedSides[0]?.id ? 0 : 1;
  }, [myParticipant, sides]);

  // Enter preparation phase between turns (called by the side that triggered it)
  const enterPrepPhase = useCallback(() => {
    if (!debate || !myParticipant) return;
    const wasMyTurn = activeSpeakerParticipant?.user_id === user?.id;

    if (wasMyTurn) {
      const myEntries = transcriptEntries
        .filter(e => e.is_final && e.subtopic === currentSubtopic?.title)
        .sort((a, b) => b.timestamp - a.timestamp);
      const lastEntry = myEntries[0];
      setLastTurnTranscript(lastEntry?.text || "");
      setLastTurnSummary(lastEntry?.ai_summary || "");
    }

    setPrepPhaseRole(wasMyTurn ? "outgoing" : "incoming");
    setPrepStartedAt(Date.now());

    // Write prep phase to DB so both sides sync
    supabase.from("debates").update({
      prep_phase_active: true,
      prep_phase_started_at: new Date().toISOString(),
      prep_side1_ready: false,
      prep_side2_ready: false,
    } as any).eq("id", debate.id);
  }, [debate, myParticipant, activeSpeakerParticipant, user?.id, transcriptEntries, currentSubtopic]);

  // Called via realtime when the OTHER side triggered prep phase
  const enterPrepPhaseFromRealtime = useCallback((updated: DebateData) => {
    if (!myParticipant || prepPhaseRole) return;
    // If prep is active and we haven't entered yet, determine our role
    const wasMyTurn = activeSpeakerParticipant?.user_id === user?.id;

    if (wasMyTurn) {
      const myEntries = transcriptEntries
        .filter(e => e.is_final && e.subtopic === currentSubtopic?.title)
        .sort((a, b) => b.timestamp - a.timestamp);
      const lastEntry = myEntries[0];
      setLastTurnTranscript(lastEntry?.text || "");
      setLastTurnSummary(lastEntry?.ai_summary || "");
    }

    setPrepPhaseRole(wasMyTurn ? "outgoing" : "incoming");
    const serverStartedAt = updated.prep_phase_started_at
      ? new Date(updated.prep_phase_started_at).getTime()
      : Date.now();
    setPrepStartedAt(serverStartedAt);
  }, [myParticipant, prepPhaseRole, activeSpeakerParticipant, user?.id, transcriptEntries, currentSubtopic]);

  const handlePrepTimeSelected = useCallback((seconds: number) => {
    setSelectedPrepDuration(seconds);
    if (debate && isCreator) {
      supabase.from("debates").update({
        prep_duration_seconds: seconds,
      } as any).eq("id", debate.id);
    }
  }, [debate, isCreator]);

  const handleSummaryEdited = useCallback((newSummary: string) => {
    // Update the transcript entry's AI summary
    const myEntries = transcriptEntries
      .filter(e => e.is_final && e.subtopic === currentSubtopic?.title)
      .sort((a, b) => b.timestamp - a.timestamp);
    const lastEntry = myEntries[0];
    if (lastEntry) {
      // The hook manages state — we update via persist
      supabase.from("debate_transcripts" as any)
        .select("*")
        .eq("debate_id", debate?.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const entries = ((data as any).transcript_entries as any[]) || [];
            const updated = entries.map((e: any) =>
              e.id === lastEntry.id ? { ...e, ai_summary: newSummary } : e
            );
            supabase.from("debate_transcripts" as any)
              .update({ transcript_entries: updated, updated_at: new Date().toISOString() } as any)
              .eq("id", (data as any).id);
          }
        });
    }
  }, [transcriptEntries, currentSubtopic, debate?.id]);

  const handlePrepReady = useCallback(() => {
    if (!debate) return;
    // Set MY side's ready flag
    const sideIdx = getMySideIndex();
    const updatePayload = sideIdx === 0
      ? { prep_side1_ready: true }
      : { prep_side2_ready: true };
    supabase.from("debates").update(updatePayload as any).eq("id", debate.id);
    // Don't clear local state yet — wait for both sides via realtime
  }, [debate, getMySideIndex]);

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
        // Generate round summary for the completing subtopic (fire-and-forget for non-publisher)
        const completingSubtopic = subtopics[debate.current_subtopic_index];
        if (completingSubtopic && isCreator) {
          generateRoundSummary(completingSubtopic.id, completingSubtopic.title);
        }

        nextSubIdx += 1;
        nextTurn = 0;
        nextSideIdx = 0;

        if (nextSubIdx >= subtopics.length) {
          // Persist transcripts before marking complete
          await persistTranscripts();

          const editWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          await supabase.from("debates").update({
            status: "completed", ended_at: new Date().toISOString(), edit_window_ends_at: editWindowEnd,
          }).eq("id", id);

          setShowCompletionOverlay(true);

          setAiLoading(true);
          try {
            const summaries = subtopics.map((st) => ({
              subtopic: st.title,
              summary: roundSummaries[st.id]?.summary || arguments_.filter((a) => a.subtopic_id === st.id).map((a) => a.content).join(" | "),
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
      const submittedText = argumentText.trim();
      setArgumentText("");
      // Add as transcript entry for AI summarization (same pipeline as speech)
      addTextEntry(submittedText, currentSide?.label || "", currentSubtopic?.title || "");
      supabase.functions.invoke("ai-facilitator", {
        body: { action: "argument_map", payload: { content: submittedText, side: currentSide?.label } },
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

  // Generate AI round summary for a completed subtopic
  const generateRoundSummary = async (subtopicId: string, subtopicTitle: string) => {
    if (!debate || !id) return;
    try {
      const stArgs = arguments_.filter((a) => a.subtopic_id === subtopicId);
      if (stArgs.length === 0) return;

      const argsPayload = stArgs.map((a) => {
        const p = participants.find((p) => p.id === a.participant_id);
        const side = sides.find((s) => s.id === p?.side_id);
        return { side: side?.label || "Unknown", content: a.content, type: a.argument_type };
      });

      const response = await fetchWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-facilitator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "round_summary",
            payload: { topic: debate.topic, subtopic: subtopicTitle, arguments: argsPayload },
          }),
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      if (data.summary) {
        // Save to DB
        await supabase.from("round_summaries").insert({
          debate_id: id,
          subtopic_id: subtopicId,
          summary: data.summary,
          key_arguments: data.key_arguments || [],
        });
        // Update local state
        setRoundSummaries((prev) => ({
          ...prev,
          [subtopicId]: { summary: data.summary, key_arguments: data.key_arguments || [] },
        }));
      }
    } catch (err) {
      console.warn("Failed to generate round summary:", err);
    }
  };

  // Persist transcript entries to debate_transcripts table
  const persistTranscripts = async () => {
    if (!id || transcriptEntries.length === 0) return;
    try {
      // Fetch existing to merge
      const { data: existing } = await supabase
        .from("debate_transcripts")
        .select("*")
        .eq("debate_id", id)
        .single();

      const serializedEntries = transcriptEntries.map((e) => ({
        id: e.id,
        text: e.text,
        speaker_side: e.speaker_side,
        subtopic: e.subtopic,
        timestamp: e.timestamp,
        is_final: e.is_final,
        ai_summary: e.ai_summary,
      }));

      if (existing) {
        // Merge: keep existing entries, add new ones by ID
        const existingEntries = (existing.transcript_entries as any[]) || [];
        const existingIds = new Set(existingEntries.map((e: any) => e.id));
        const merged = [...existingEntries, ...serializedEntries.filter((e) => !existingIds.has(e.id))];
        await supabase
          .from("debate_transcripts")
          .update({ transcript_entries: merged, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("debate_transcripts").insert({
          debate_id: id,
          transcript_entries: serializedEntries,
        });
      }
    } catch (err) {
      console.warn("Failed to persist transcripts:", err);
    }
  };

  const handleExtendTime = () => {
    setTimeLeft((t) => t + 60);
    toast.info("Extended by 1 minute");
  };

  const handleSkipTurn = () => {
    advanceTurn();
  };

  const handleNextSubtopic = async () => {
    if (!debate || !id || advancingRef.current) return;
    advancingRef.current = true;
    try {
      // Generate round summary for completing subtopic
      const completingSubtopic = subtopics[debate.current_subtopic_index];
      if (completingSubtopic && isCreator) {
        generateRoundSummary(completingSubtopic.id, completingSubtopic.title);
      }

      let nextSubIdx = debate.current_subtopic_index + 1;
      if (nextSubIdx >= subtopics.length) {
        await persistTranscripts();
        const editWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        await supabase.from("debates").update({
          status: "completed", ended_at: new Date().toISOString(), edit_window_ends_at: editWindowEnd,
        }).eq("id", id);
        setShowCompletionOverlay(true);
        return;
      }
      const turnNow = new Date().toISOString();
      await supabase.from("debates").update({
        current_subtopic_index: nextSubIdx, current_turn: 0,
        current_speaker_side_id: sides[0]?.id, turn_started_at: turnNow,
      }).eq("id", id);
      setTimeLeft(parseTimeToSeconds(debate.time_per_turn));
      setTimerRunning(true);
    } finally {
      advancingRef.current = false;
    }
  };

  // End turn early — available to all speakers
  const endTurnEarly = () => {
    setTimerRunning(false);
    setTimeLeft(0);
    enterPrepPhase();
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
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0 w-full">
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
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl p-4 shadow-lg z-50">
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
                  <div className="border-t border-border mt-3 pt-3">
                    <p className="text-xs text-muted-foreground mb-2 font-body">Audience / Projector links:</p>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/debate/${id}/audience`); toast.success("Audience link copied!"); }}
                        className="w-full text-left flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 hover:bg-secondary/70 transition-colors"
                      >
                        <code className="text-[10px] text-foreground flex-1 truncate">/debate/{id?.slice(0,8)}…/audience</code>
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => { window.open(`/debate/${id}/projector`, '_blank'); }}
                        className="w-full text-left flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 hover:bg-secondary/70 transition-colors"
                      >
                        <code className="text-[10px] text-foreground flex-1 truncate">/debate/{id?.slice(0,8)}…/projector</code>
                        <span className="text-[10px] text-primary font-semibold">Open ↗</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mic/Connection error banners */}
      {micError && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive font-body">{micError}</span>
        </div>
      )}
      {connectionError && !micError && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive font-body">{connectionError}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden w-full min-w-0">
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
            debateId={id!}
            debate={debate}
            sides={sides}
            subtopics={subtopics}
            arguments={arguments_}
            participants={participants}
            timeLeft={timeLeft}
            timerRunning={timerRunning}
            aiMessage={aiMessage}
            aiLoading={aiLoading}
            transcriptEntries={transcriptEntries}
            deepgramConnected={deepgramConnected}
            interimText={interimText}
            onToggleTimer={() => setTimerRunning(!timerRunning)}
            onResetTimer={() => setTimeLeft(parseTimeToSeconds(debate.time_per_turn))}
            onExtendTime={handleExtendTime}
            onSkipTurn={handleSkipTurn}
            onNextTurn={advanceTurn}
          />
        )}

        {isLive && (isSpeaker || (isFacilitator && facilitatorSpeaking)) && (
          <div className="flex-1 flex overflow-hidden w-full min-w-0 relative">
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
              isPublisher={isCreator}
              timerRunning={timerRunning}
              transcriptEntries={transcriptEntries}
              deepgramConnected={deepgramConnected}
              deepgramActive={deepgramActive}
              interimText={interimText}
              onArgumentTextChange={setArgumentText}
              onSetRecording={setIsRecording}
              onSubmit={submitArgument}
              onEndTurnEarly={endTurnEarly}
              onToggleDeepgram={() => setDeepgramActive(prev => !prev)}
              onToggleTimer={() => setTimerRunning(!timerRunning)}
              onExtendTime={handleExtendTime}
              onSkipTurn={handleSkipTurn}
              onNextSubtopic={handleNextSubtopic}
              roundSummaries={roundSummaries}
            />
            {/* Prep phase overlay */}
            {prepPhaseRole && (
              <PrepPhaseOverlay
                role={prepPhaseRole}
                prepTimeMin={parseTimeToSeconds(debate.prep_time_min || "15s")}
                prepTimeMax={parseTimeToSeconds(debate.prep_time_max || "60s")}
                lastTranscript={lastTurnTranscript}
                lastAiSummary={lastTurnSummary}
                speakerSideLabel={currentSide?.label || ""}
                onPrepTimeSelected={handlePrepTimeSelected}
                onSummaryEdited={handleSummaryEdited}
                onReady={handlePrepReady}
                prepStartedAt={prepStartedAt || undefined}
                selectedPrepDuration={selectedPrepDuration || undefined}
                allTranscriptEntries={transcriptEntries}
                subtopics={subtopics.map(st => ({ id: st.id, title: st.title }))}
                sides={sides.map(s => ({ id: s.id, label: s.label }))}
                isSummaryBeingEdited={
                  debate.prep_phase_active && prepPhaseRole === "incoming" &&
                  !(getMySideIndex() === 0 ? debate.prep_side2_ready : debate.prep_side1_ready)
                }
                notebookValue={notebookContent}
                onNotebookChange={setNotebookContent}
              />
            )}
            {/* Notebook button — visible during live debate when not in prep */}
            {!prepPhaseRole && isSpeaker && (
              <button
                onClick={() => setNotebookOpen(true)}
                className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
                title="My Notes"
              >
                <NotebookPen className="w-4 h-4 text-foreground" />
              </button>
            )}
            {/* Notebook Sheet */}
            <Sheet open={notebookOpen} onOpenChange={setNotebookOpen}>
              <SheetContent side="right" className="w-[340px] sm:w-[400px] flex flex-col">
                <SheetHeader>
                  <SheetTitle className="font-display">My Notes</SheetTitle>
                </SheetHeader>
                <textarea
                  value={notebookContent}
                  onChange={(e) => setNotebookContent(e.target.value)}
                  placeholder="Your preparation notes appear here…"
                  className="flex-1 mt-4 w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </SheetContent>
            </Sheet>
          </div>
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
          <div className="flex-1 flex flex-col relative">
            {/* Completion overlay */}
            {showCompletionOverlay && (
              <DebateCompletionOverlay
                topic={debate.topic}
                subtopicCount={subtopics.length}
                argumentCount={arguments_.length}
                editWindowEndsAt={debate.edit_window_ends_at}
                debateId={id!}
                onDismiss={() => setShowCompletionOverlay(false)}
              />
            )}

            {debate.edit_window_ends_at && (
              <EditWindowBanner
                editWindowEndsAt={debate.edit_window_ends_at}
                isParticipant={!!myParticipant}
              />
            )}

            {/* AI closing synthesis */}
            {aiMessage && (
              <div className="border-b border-primary/20 bg-primary/5 px-6 py-4 shrink-0">
                <div className="flex items-start gap-3 max-w-3xl mx-auto">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-primary mb-0.5 font-display">d. — Closing Synthesis</p>
                    <p className="text-xs text-foreground leading-relaxed font-body">{aiMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {/* Overall Summary */}
              {(() => {
                const allSummaryTexts = Object.values(roundSummaries).map(rs => rs.summary).filter(Boolean);
                const overallText = aiMessage || (allSummaryTexts.length > 0 ? allSummaryTexts.join("\n\n") : null);
                if (!overallText) return null;
                return (
                  <div className="border border-primary/20 bg-primary/5 rounded-xl overflow-hidden mb-2">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/10">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary font-display">
                        Overall Summary
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-foreground leading-relaxed font-body whitespace-pre-wrap">{overallText}</p>
                    </div>
                  </div>
                );
              })()}

              {subtopics.map((st, stIdx) => {
                const stTranscripts = transcriptEntries.filter(e => e.is_final && e.subtopic === st.title);
                const stArgs = arguments_.filter((a) => a.subtopic_id === st.id);
                const hasContent = stTranscripts.length > 0 || stArgs.length > 0;
                const roundSummary = roundSummaries[st.id];

                const getSideOrder = (sideLabel: string): number => {
                  const side = sides.find((s) => s.label.toLowerCase() === sideLabel.toLowerCase());
                  return side?.sort_order ?? 0;
                };

                return (
                  <Collapsible key={st.id} defaultOpen={stIdx === 0}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-xl border border-border bg-card px-5 py-4 text-left hover:bg-accent/50 transition-colors">
                      <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                      <h3 className="text-sm font-display font-semibold text-foreground flex-1">
                        {stIdx + 1}. {st.title}
                      </h3>
                      {roundSummary && (
                        <span className="text-[9px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold">
                          Summarized
                        </span>
                      )}
                      {hasContent && (
                        <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                          {stTranscripts.length + stArgs.length}
                        </span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-5 py-3 space-y-2">
                        {/* Round summary pinned at top */}
                        {roundSummary && (
                          <RoundSummaryCard
                            summary={roundSummary.summary}
                            keyArguments={roundSummary.key_arguments}
                            subtopicTitle={st.title}
                          />
                        )}
                        {/* Transcript cards */}
                        {stTranscripts.map((entry) => (
                          <TranscriptCard
                            key={entry.id}
                            speakerSide={entry.speaker_side}
                            sideOrder={getSideOrder(entry.speaker_side)}
                            text={entry.text}
                            aiSummary={entry.ai_summary}
                            timestamp={entry.timestamp}
                          />
                        ))}
                        {/* Submitted arguments (skip those with matching transcript entries) */}
                        {(() => {
                          const transcriptTexts = new Set(stTranscripts.map(t => t.text.trim().toLowerCase()));
                          return stArgs
                            .filter(arg => !transcriptTexts.has(arg.content.trim().toLowerCase()))
                            .map((arg) => {
                              const participant = participants.find((p) => p.id === arg.participant_id);
                              const side = sides.find((s) => s.id === participant?.side_id);
                              return (
                                <TranscriptCard
                                  key={arg.id}
                                  speakerSide={side?.label || "Unknown"}
                                  sideOrder={side?.sort_order ?? 0}
                                  text={arg.content}
                                />
                              );
                            });
                        })()}
                        {!hasContent && !roundSummary && (
                          <p className="text-xs text-muted-foreground italic font-body py-2">No statements recorded</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
