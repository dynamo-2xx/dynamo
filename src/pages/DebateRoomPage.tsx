import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play, Share2, Copy, Check, ChevronRight, ChevronDown, AlertCircle, Zap, Award
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
import DebateRecordPreview from "@/components/debate/DebateRecordPreview";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";
import AppLayout from "@/components/AppLayout";
import InPersonMicBar from "@/components/debate/InPersonMicBar";
import { takeHandoffStream } from "@/lib/micHandoff";
import { ArrowLeft, HandHeart } from "lucide-react";
import InterestedComposer from "@/components/debate/InterestedComposer";
import DebateCompletionOverlay from "@/components/debate/DebateCompletionOverlay";
import RoundSummaryCard from "@/components/debate/RoundSummaryCard";
import PrepPhaseOverlay from "@/components/debate/PrepPhaseOverlay";
import { useDeepgramTranscription } from "@/hooks/useDeepgramTranscription";
import { useGrading } from "@/hooks/useGrading";
import TranscriptCard from "@/components/debate/TranscriptCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import RecordToolsMount from "@/components/record/RecordToolsMount";
import ArgumentMapOverlay from "@/components/debate/ArgumentMapOverlay";
import NotebookOverlay from "@/components/debate/NotebookOverlay";
import DebateHighlightLayer from "@/components/debate/DebateHighlightLayer";
import DebateRecordShell from "@/components/debate/DebateRecordShell";
import { Map as MapIcon, NotebookPen } from "lucide-react";


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
  feedback_enabled?: boolean;
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
  const [aiMessageStreaming, setAiMessageStreaming] = useState(false);
  const [aiMessageCollapsed, setAiMessageCollapsed] = useState(false);
  const [aiMessagePulse, setAiMessagePulse] = useState(false);
  const aiCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaRequested, setMediaRequested] = useState(false);
   const turnEndTriggeredRef = useRef(false);
  // In-person joiner: pick up the live MediaStream the pre-flight mic test
  // handed off so we can show the persistent mic bar without re-prompting.
  const [handoffStream] = useState<MediaStream | null>(() => takeHandoffStream());
     const timerWasActiveRef = useRef(false);
   const prepExitRef = useRef(false);
   const lastSyncedTurnStartRef = useRef<string | null>(null);
  const completePrepPhaseAndAdvanceRef = useRef<() => Promise<void>>(async () => {});
  const prepPhaseRoleRef = useRef<"incoming" | "outgoing" | null>(null);
  const enterPrepPhaseFromRealtimeRef = useRef<(updated: DebateData) => void>(() => {});
  const advanceTurnRef = useRef<() => Promise<void>>(async () => {});
  const sidesRef = useRef<Side[]>([]);
  const participantsRef = useRef<Participant[]>([]);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [roundSummaries, setRoundSummaries] = useState<Record<string, { summary: string; key_arguments: Array<{ side: string; content: string; type: string; significance: string }> }>>({});
  const [prepPhaseRole, setPrepPhaseRole] = useState<"incoming" | "outgoing" | null>(null);
  const [prepStartedAt, setPrepStartedAt] = useState<number | null>(null);
  const [selectedPrepDuration, setSelectedPrepDuration] = useState<number | null>(null);
  const [lastTurnTranscript, setLastTurnTranscript] = useState<string>("");
  const [lastTurnSummary, setLastTurnSummary] = useState<string>("");
  const [prepSpeakerSideLabel, setPrepSpeakerSideLabel] = useState<string>("");
  const [notebookContent, setNotebookContent] = useState<string>("");
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [argumentMapOpen, setArgumentMapOpen] = useState(false);

  // Grading
  const { gradeTurn, gradeFinal } = useGrading();
  const lastGradedTurnRef = useRef<string | null>(null);
  const finalGradedRef = useRef(false);

  // Per-turn grading: when current_turn or current_subtopic_index advances,
  // grade the speaker (and their last argument) for the turn that just ended.
  useEffect(() => {
    if (!debate?.feedback_enabled || !debate || !id) return;
    if (debate.status !== "live") return;
    if (!sides.length || !subtopics.length) return;

    const prevSubIdx = debate.current_subtopic_index;
    const prevTurn = debate.current_turn;
    // Identify the side that just spoke = the one BEFORE the current speaker in rotation.
    const currentSideIdx = sides.findIndex((s) => s.id === debate.current_speaker_side_id);
    if (currentSideIdx < 0) return;
    const justSpokeIdx = (currentSideIdx - 1 + sides.length) % sides.length;
    const justSpokeSide = sides[justSpokeIdx];
    if (!justSpokeSide) return;
    const justSpokeSubtopic = subtopics[prevSubIdx];
    if (!justSpokeSubtopic) return;

    // Their participant
    const speakerParticipant = participants.find((p) => p.side_id === justSpokeSide.id);
    if (!speakerParticipant) return;

    // Most recent argument for that participant in this subtopic
    const theirArgs = arguments_.filter(
      (a) => a.participant_id === speakerParticipant.id && a.subtopic_id === justSpokeSubtopic.id
    );
    const lastArg = theirArgs[theirArgs.length - 1];
    if (!lastArg) return;

    const key = `${speakerParticipant.id}|${justSpokeSubtopic.id}|${prevTurn}|${lastArg.id}`;
    if (lastGradedTurnRef.current === key) return;
    lastGradedTurnRef.current = key;

    const opposing = arguments_
      .filter((a) => a.subtopic_id === justSpokeSubtopic.id && a.participant_id !== speakerParticipant.id)
      .slice(-3)
      .map((a) => {
        const p = participants.find((pp) => pp.id === a.participant_id);
        const s = sides.find((ss) => ss.id === p?.side_id);
        return { side: s?.label ?? "Unknown", content: a.content };
      });

    gradeTurn({
      debateId: id,
      participantId: speakerParticipant.id,
      userId: speakerParticipant.user_id,
      subtopicId: justSpokeSubtopic.id,
      turnIndex: prevTurn,
      topic: debate.topic,
      subtopic: justSpokeSubtopic.title,
      side: justSpokeSide.label,
      content: lastArg.content,
      opposingArguments: opposing,
      includeResolution: subtopics.length >= 4, // collaborative mode adds a 4th+ resolution subtopic
    });
  }, [debate?.current_turn, debate?.current_subtopic_index, debate?.current_speaker_side_id, debate?.feedback_enabled, debate?.status, sides, subtopics, participants, arguments_, gradeTurn, id, debate?.topic]);

  // Final grading: once the debate is completed, grade every participant once.
  useEffect(() => {
    if (!debate?.feedback_enabled || !debate || !id) return;
    if (debate.status !== "completed") return;
    if (finalGradedRef.current) return;
    if (!sides.length || !participants.length || !subtopics.length) return;
    finalGradedRef.current = true;

    participants.forEach((p) => {
      const side = sides.find((s) => s.id === p.side_id);
      if (!side) return;
      const myArgs = arguments_
        .filter((a) => a.participant_id === p.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (!myArgs.length) return;
      const allTurns = myArgs.map((a) => ({
        subtopic: subtopics.find((s) => s.id === a.subtopic_id)?.title ?? "",
        content: a.content,
      }));
      const opposingTurns = arguments_
        .filter((a) => a.participant_id !== p.id)
        .map((a) => {
          const op = participants.find((pp) => pp.id === a.participant_id);
          const os = sides.find((ss) => ss.id === op?.side_id);
          return {
            subtopic: subtopics.find((s) => s.id === a.subtopic_id)?.title ?? "",
            side: os?.label ?? "Unknown",
            content: a.content,
          };
        });
      gradeFinal({
        debateId: id,
        participantId: p.id,
        userId: p.user_id,
        topic: debate.topic,
        side: side.label,
        allTurns,
        opposingTurns,
        includeResolution: subtopics.length >= 4,
      });
    });
  }, [debate?.status, debate?.feedback_enabled, debate, id, sides, subtopics, participants, arguments_, gradeFinal]);

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
    // Only request mic/camera while the debate is actively LIVE. Opening a
    // completed debate's record (or a draft) must NOT trigger a permission
    // prompt — there's no recording happening.
    if (debate?.status !== "live") return;

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
  }, [userRole, loading, mediaRequested, debate?.status]);

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
         lastSyncedTurnStartRef.current = d.turn_started_at;
         const elapsed = Math.floor((Date.now() - new Date(d.turn_started_at).getTime()) / 1000);
         const remaining = Math.max(0, parseTimeToSeconds(d.time_per_turn) - elapsed);
         setTimeLeft(remaining);
          if (remaining > 0) {
            setTimerRunning(true);
          } else if (!d.prep_phase_active) {
            // Turn already expired — mark timer as "was active" so the auto-trigger fires
            timerWasActiveRef.current = true;
          }
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

        if (updated.prep_phase_active) {
          setTimerRunning(false);
          setTimeLeft(0);
        }

        // Sync timer from turn_started_at — only if it actually changed
         if (!updated.prep_phase_active && updated.turn_started_at && updated.status === "live" && updated.turn_started_at !== lastSyncedTurnStartRef.current) {
           lastSyncedTurnStartRef.current = updated.turn_started_at;
           const elapsed = Math.floor((Date.now() - new Date(updated.turn_started_at).getTime()) / 1000);
           const remaining = Math.max(0, parseTimeToSeconds(updated.time_per_turn) - elapsed);
           setTimeLeft(remaining);
           if (remaining > 0) setTimerRunning(true);
           else setTimerRunning(false);
         }
        // Sync prep phase from other participant
        if (updated.prep_phase_active) {
          if (!prepPhaseRoleRef.current) {
            enterPrepPhaseFromRealtimeRef.current(updated);
          }

          setSelectedPrepDuration(updated.prep_duration_seconds ?? null);
          setPrepStartedAt(
            updated.prep_phase_started_at
              ? new Date(updated.prep_phase_started_at).getTime()
              : null,
          );
        }

        // Check readiness BEFORE clearing prep state to avoid race condition.
        // Only require ready flags from sides that actually have speakers — this
        // makes single-participant / single-side debates progress correctly.
        const sortedSides = [...sidesRef.current].sort((a, b) => a.sort_order - b.sort_order);
        const partsList = participantsRef.current;
        const side1HasSpeaker = sortedSides[0]
          ? partsList.some((p) => p.side_id === sortedSides[0].id && p.participant_role === "speaker")
          : false;
        const side2HasSpeaker = sortedSides[1]
          ? partsList.some((p) => p.side_id === sortedSides[1].id && p.participant_role === "speaker")
          : false;
        const side1Ready = !side1HasSpeaker || updated.prep_side1_ready;
        const side2Ready = !side2HasSpeaker || updated.prep_side2_ready;
        const allReady = side1Ready && side2Ready && (side1HasSpeaker || side2HasSpeaker);
        if (allReady && prepPhaseRoleRef.current && !prepExitRef.current) {
          void completePrepPhaseAndAdvanceRef.current();
        }

        // Clear local prep state only after the bothReady check
        if (!updated.prep_phase_active && prepPhaseRoleRef.current) {
          setPrepPhaseRole(null);
          setPrepStartedAt(null);
          setSelectedPrepDuration(null);
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

   // Timer — 1-second countdown driven by local interval
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerWasActiveRef.current = true;
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { setTimerRunning(false); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timeLeft]);

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

  // Enter preparation phase between turns (called by any speaker/facilitator when timer expires)
  const enterPrepPhase = useCallback(() => {
     if (!debate || !myParticipant || debate.prep_phase_active) return;

     const outgoingSideLabel = currentSide?.label || "";
     // Determine role: if I'm on the side that was just speaking, I'm "outgoing"; otherwise "incoming"
     const iAmOnCurrentSide = myParticipant.side_id === currentSide?.id;

     const myEntries = transcriptEntries
       .filter((e) => e.is_final && e.subtopic === currentSubtopic?.title && e.speaker_side === outgoingSideLabel)
       .sort((a, b) => b.timestamp - a.timestamp);
     const lastEntry = myEntries[0];

     setLastTurnTranscript(lastEntry?.text || "");
     setLastTurnSummary(lastEntry?.ai_summary || "");
     setPrepSpeakerSideLabel(outgoingSideLabel);
     setPrepPhaseRole(iAmOnCurrentSide ? "outgoing" : "incoming");

     const prepSeconds = parseTimeToSeconds(debate.prep_time_max || "60s");
     const startedAt = new Date().toISOString();

     setPrepStartedAt(new Date(startedAt).getTime());
     setSelectedPrepDuration(prepSeconds);
    setTimerRunning(false);
    setTimeLeft(0);

      // Write prep phase to DB — use idempotent guard so only the first writer wins
      supabase.from("debates").update({
      prep_phase_active: true,
       prep_phase_started_at: startedAt,
       prep_duration_seconds: prepSeconds,
      prep_side1_ready: false,
      prep_side2_ready: false,
      } as any).eq("id", debate.id).eq("prep_phase_active", false).then(({ error }) => {
       if (error) console.error("Failed to write prep phase to DB:", error);
     });
  }, [debate, myParticipant, transcriptEntries, currentSubtopic, currentSide]);

   // Reset turn-end guard whenever a new turn starts (turn_started_at changes)
   useEffect(() => {
     if (debate?.turn_started_at) {
       turnEndTriggeredRef.current = false;
       timerWasActiveRef.current = false;
     }
   }, [debate?.turn_started_at]);

   // Auto-trigger prep when the turn timer reaches 0
  useEffect(() => {
    if (
      timeLeft === 0 &&
       timerRunning === false &&
       timerWasActiveRef.current &&
      debate?.status === "live" &&
      !debate.prep_phase_active &&
       !prepPhaseRole &&
       (isSpeaker || isFacilitator) &&
       !turnEndTriggeredRef.current
    ) {
       turnEndTriggeredRef.current = true;
      enterPrepPhase();
    }
   }, [timeLeft, timerRunning, debate?.status, debate?.prep_phase_active, prepPhaseRole, isSpeaker, isFacilitator, enterPrepPhase]);

   // Called via realtime when the speaker (other side) triggered prep phase
  const enterPrepPhaseFromRealtime = useCallback((updated: DebateData) => {
    if (!myParticipant || prepPhaseRole) return;
    const outgoingSideId = updated.current_speaker_side_id;
    const outgoingSideLabel = sides.find((side) => side.id === outgoingSideId)?.label || "";
    const prepSubtopicTitle = subtopics[updated.current_subtopic_index ?? 0]?.title;
    const amOutgoingSide = myParticipant.side_id === outgoingSideId;

    setPrepSpeakerSideLabel(outgoingSideLabel);

    if (amOutgoingSide) {
      const myEntries = transcriptEntries
        .filter((e) => e.is_final && e.subtopic === prepSubtopicTitle && e.speaker_side === outgoingSideLabel)
        .sort((a, b) => b.timestamp - a.timestamp);
      const lastEntry = myEntries[0];
      setLastTurnTranscript(lastEntry?.text || "");
      setLastTurnSummary(lastEntry?.ai_summary || "");
      setPrepPhaseRole("outgoing");
    } else {
      setPrepPhaseRole("incoming");
    }

    setPrepStartedAt(updated.prep_phase_started_at ? new Date(updated.prep_phase_started_at).getTime() : null);
    setSelectedPrepDuration(updated.prep_duration_seconds ?? null);
    setTimerRunning(false);
    setTimeLeft(0);
  }, [myParticipant, prepPhaseRole, sides, subtopics, transcriptEntries]);

  const completePrepPhaseAndAdvance = useCallback(async () => {
    if (!id || !debate || prepExitRef.current) return;

    prepExitRef.current = true;

    try {
      const currentSideIdx = sides.findIndex((side) => side.id === debate.current_speaker_side_id);
      let nextSideIdx = (currentSideIdx + 1) % sides.length;
      let nextTurn = debate.current_turn;
      let nextSubIdx = debate.current_subtopic_index;

      if (nextSideIdx === 0) nextTurn += 1;

      const basePrepReset = {
        prep_phase_active: false,
        prep_phase_started_at: null,
        prep_duration_seconds: null,
        prep_side1_ready: false,
        prep_side2_ready: false,
      };

      if (nextTurn >= debate.turns_per_subtopic) {
        const completingSubtopic = subtopics[debate.current_subtopic_index];
        if (completingSubtopic && isCreator) {
          generateRoundSummary(completingSubtopic.id, completingSubtopic.title);
        }

        nextSubIdx += 1;
        nextTurn = 0;
        nextSideIdx = 0;

        if (nextSubIdx >= subtopics.length) {
          await persistTranscripts();

          const editWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          const { data, error } = await supabase
            .from("debates")
            .update({
              ...basePrepReset,
              status: "completed",
              ended_at: new Date().toISOString(),
              edit_window_ends_at: editWindowEnd,
            } as any)
            .eq("id", id)
            .eq("prep_phase_active", true)
            .select("id")
            .maybeSingle();

          if (error) throw error;
          if (!data) return;

          setPrepPhaseRole(null);
          setPrepStartedAt(null);
          setSelectedPrepDuration(null);
          setPrepSpeakerSideLabel("");
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
      const { data, error } = await supabase
        .from("debates")
        .update({
          ...basePrepReset,
          current_subtopic_index: nextSubIdx,
          current_turn: nextTurn,
          current_speaker_side_id: sides[nextSideIdx]?.id,
          turn_started_at: turnNow,
        } as any)
        .eq("id", id)
        .eq("prep_phase_active", true)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      lastSyncedTurnStartRef.current = turnNow;
      setPrepPhaseRole(null);
      setPrepStartedAt(null);
      setSelectedPrepDuration(null);
      setPrepSpeakerSideLabel("");
      setTimeLeft(parseTimeToSeconds(debate.time_per_turn));
      setTimerRunning(true);

      setAiLoading(true);
      try {
        await streamAI("advance_turn", {
          topic: debate.topic,
          subtopic: subtopics[nextSubIdx]?.title,
          previousArguments: currentSubtopicArgs.slice(-3).map((a) => ({
            side: sides.find((side) => {
              const participant = participants.find((p) => p.id === a.participant_id);
              return participant?.side_id === side.id;
            })?.label || "Unknown",
            content: a.content,
          })),
          nextSide: sides[nextSideIdx]?.label,
        });
      } catch {
        setAiMessage(`Now speaking: ${sides[nextSideIdx]?.label}`);
      }
      setAiLoading(false);
    } finally {
      prepExitRef.current = false;
    }
  }, [id, debate, sides, subtopics, isCreator, roundSummaries, arguments_, currentSubtopicArgs, participants]);

  useEffect(() => {
    completePrepPhaseAndAdvanceRef.current = completePrepPhaseAndAdvance;
  }, [completePrepPhaseAndAdvance]);

  const handleSummaryEdited = useCallback((newSummary: string) => {
    // Update the transcript entry's AI summary
    const myEntries = transcriptEntries
      .filter(e => e.is_final && e.subtopic === currentSubtopic?.title && e.speaker_side === prepSpeakerSideLabel)
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
  }, [transcriptEntries, currentSubtopic, prepSpeakerSideLabel, debate?.id]);

  const handlePrepReady = useCallback(async () => {
    if (!debate) return;
    // Set MY side's ready flag
    const sideIdx = getMySideIndex();
    const updatePayload = sideIdx === 0
      ? { prep_side1_ready: true }
      : { prep_side2_ready: true };
    const { error } = await supabase.from("debates").update(updatePayload as any).eq("id", debate.id);
    if (error) {
      console.error("Failed to set ready flag:", error);
      toast.error("Failed to signal ready. Please try again.");
    }
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
    setAiMessageStreaming(true);
    // Clear any pending auto-collapse and reopen the panel for the new message
    if (aiCollapseTimerRef.current) {
      clearTimeout(aiCollapseTimerRef.current);
      aiCollapseTimerRef.current = null;
    }
    setAiMessageCollapsed(false);
    setAiMessagePulse(false);
    try {
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
    } finally {
      setAiMessageStreaming(false);
    }
  };

  // Auto-collapse the d. narration 5s after streaming ends; pulse the logo button briefly
  useEffect(() => {
    if (aiMessageStreaming || !aiMessage) return;
    setAiMessagePulse(true);
    if (aiPulseTimerRef.current) clearTimeout(aiPulseTimerRef.current);
    aiPulseTimerRef.current = setTimeout(() => setAiMessagePulse(false), 2000);
    if (aiCollapseTimerRef.current) clearTimeout(aiCollapseTimerRef.current);
    aiCollapseTimerRef.current = setTimeout(() => setAiMessageCollapsed(true), 5000);
    return () => {
      if (aiCollapseTimerRef.current) clearTimeout(aiCollapseTimerRef.current);
      if (aiPulseTimerRef.current) clearTimeout(aiPulseTimerRef.current);
    };
  }, [aiMessageStreaming, aiMessage]);

  // Collapse immediately when the speaker timer starts ticking with a fresh turn
  useEffect(() => {
    if (timerRunning && !aiMessageStreaming && aiMessage) {
      if (aiCollapseTimerRef.current) clearTimeout(aiCollapseTimerRef.current);
      setAiMessageCollapsed(true);
    }
  }, [timerRunning, aiMessageStreaming, aiMessage]);

  const toggleAiMessage = useCallback(() => {
    if (aiCollapseTimerRef.current) {
      clearTimeout(aiCollapseTimerRef.current);
      aiCollapseTimerRef.current = null;
    }
    setAiMessagePulse(false);
    setAiMessageCollapsed((prev) => !prev);
  }, []);

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

  useEffect(() => {
    prepPhaseRoleRef.current = prepPhaseRole;
  }, [prepPhaseRole]);

  useEffect(() => { sidesRef.current = sides; }, [sides]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  useEffect(() => {
    enterPrepPhaseFromRealtimeRef.current = enterPrepPhaseFromRealtime;
  }, [enterPrepPhaseFromRealtime]);

   // Local fallback: poll for prep phase expiry in case realtime is delayed
   useEffect(() => {
     if (!prepPhaseRole || !prepStartedAt || !selectedPrepDuration) return;
     const interval = setInterval(() => {
       const expired = Date.now() >= prepStartedAt + selectedPrepDuration * 1000;
       if (expired && !prepExitRef.current) {
         clearInterval(interval);
         void completePrepPhaseAndAdvanceRef.current();
       }
     }, 1000);
     return () => clearInterval(interval);
   }, [prepPhaseRole, prepStartedAt, selectedPrepDuration]);

   useEffect(() => {
     advanceTurnRef.current = advanceTurn;
   }, [advanceTurn]);

   // Catch prep phase on initial load or if realtime state update triggers before role is set
   useEffect(() => {
     if (debate?.prep_phase_active && myParticipant && !prepPhaseRole) {
       enterPrepPhaseFromRealtime(debate);
     }
   }, [debate, myParticipant, prepPhaseRole, enterPrepPhaseFromRealtime]);

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
     if (!isMyTurn) return;
     turnEndTriggeredRef.current = true;
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

  // Spectator preview: non-participant viewers on scheduled or live debates
  // see a record-style shell (with live threads-so-far for live debates,
  // or ghost cards for scheduled). Owners and speakers keep the full room UI.
  const isParticipant = !!myParticipant;
  const showSpectatorPreview =
    !isParticipant && !isCreator && (debate.status === "scheduled" || debate.status === "live");

  if (showSpectatorPreview) {
    return <SpectatorPreviewShell debate={debate} navigate={navigate} userId={user?.id ?? null} />;
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden" data-record-root>
      {user && id && (
        <DebateHighlightLayer recordType="debate" recordId={id} />
      )}
      {handoffStream && (
        <InPersonMicBar
          initialStream={handoffStream}
          displayName={user?.email ?? null}
        />
      )}
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
            aiMessageCollapsed={aiMessageCollapsed}
            aiMessagePulse={aiMessagePulse}
            onToggleAiMessage={toggleAiMessage}
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
              aiMessageCollapsed={aiMessageCollapsed}
              aiMessagePulse={aiMessagePulse}
              onToggleAiMessage={toggleAiMessage}
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
              onOpenNotebook={() => setNotebookOpen(true)}
              notebookOpen={notebookOpen}
              notebookContent={notebookContent}
              onNotebookContentChange={setNotebookContent}
              onCloseNotebook={() => setNotebookOpen(false)}
              roundSummaries={roundSummaries}
            />
            {/* Prep phase overlay */}
            {prepPhaseRole && (
              <PrepPhaseOverlay
                role={prepPhaseRole}
                prepTimeMin={parseTimeToSeconds(debate.prep_time_min || "15s")}
                 prepTimeMax={parseTimeToSeconds(debate.prep_time_max || "1 min")}
                lastTranscript={lastTurnTranscript}
                lastAiSummary={lastTurnSummary}
                speakerSideLabel={currentSide?.label || ""}
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
            {/* Notebook button now lives inside ParticipantSharedView's metadata-row stack */}
            {/* Notebook is rendered as a translucent draggable overlay inside ParticipantSharedView */}
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
                feedbackEnabled={!!debate.feedback_enabled}
                onDismiss={() => setShowCompletionOverlay(false)}
              />
            )}

            <div className="flex-1 overflow-y-auto" data-annotatable>
              <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
                <DebateRecordShell
                  debateId={debate.id}
                  topic={debate.topic}
                  description={debate.description}
                  status={debate.status}
                  scheduledAt={debate.scheduled_at}
                  coverImageUrl={(debate as any).cover_image_url}
                  participantCount={participants.length}
                  rolePill={isFacilitator ? "Facilitator" : isSpeaker ? "Speaker" : undefined}
                  fallbackSubtopics={subtopics.map((s) => ({ id: s.id, title: s.title }))}
                  fallbackSideLabels={sides.map((s) => s.label)}
                  subtopicCounts={Object.fromEntries(
                    subtopics.map((st) => {
                      const stTr = transcriptEntries.filter((e) => e.is_final && e.subtopic === st.title);
                      const stArgs = arguments_.filter((a) => a.subtopic_id === st.id);
                      return [st.id, stTr.length + stArgs.length];
                    })
                  )}
                  banner={
                    <>
                      {debate.edit_window_ends_at && (
                        <EditWindowBanner
                          editWindowEndsAt={debate.edit_window_ends_at}
                          isParticipant={!!myParticipant}
                        />
                      )}
                      {debate.feedback_enabled && !!myParticipant && (
                        <div className="rounded-xl border border-border bg-accent/40 px-4 py-3 mt-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Award className="w-4 h-4 text-foreground shrink-0" />
                              <p className="text-xs font-body text-foreground truncate">
                                Your private performance report is ready.
                              </p>
                            </div>
                            <button
                              onClick={() => navigate(`/debate/${id}/grade`)}
                              className="shrink-0 text-xs font-body font-semibold bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
                            >
                              View Your Performance
                            </button>
                          </div>
                        </div>
                      )}
                      {(() => {
                        const allSummaryTexts = Object.values(roundSummaries).map((rs) => rs.summary).filter(Boolean);
                        const overallText = aiMessage || (allSummaryTexts.length > 0 ? allSummaryTexts.join("\n\n") : null);
                        if (!overallText) return null;
                        return (
                          <div className="border border-primary/20 bg-primary/5 rounded-xl overflow-hidden mt-3">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/10">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Zap className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-widest text-primary font-display">
                                {aiMessage ? "d. — Closing Synthesis" : "Overall Summary"}
                              </span>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-sm text-foreground leading-relaxed font-body whitespace-pre-wrap">{overallText}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  }
                  renderSubtopicContent={(subtopicId, subtopicTitle) => {
                    const st = subtopics.find((s) => s.id === subtopicId);
                    if (!st) return null;
                    const stTranscripts = transcriptEntries.filter((e) => e.is_final && e.subtopic === subtopicTitle);
                    const stArgs = arguments_.filter((a) => a.subtopic_id === st.id);
                    const roundSummary = roundSummaries[st.id];
                    const getSideOrder = (sideLabel: string): number => {
                      const side = sides.find((s) => s.label.toLowerCase() === sideLabel.toLowerCase());
                      return side?.sort_order ?? 0;
                    };
                    const transcriptTexts = new Set(stTranscripts.map((t) => t.text.trim().toLowerCase()));
                    const orphanArgs = stArgs.filter((arg) => !transcriptTexts.has(arg.content.trim().toLowerCase()));
                    const hasContent = stTranscripts.length > 0 || orphanArgs.length > 0;
                    if (!hasContent && !roundSummary) {
                      return (
                        <p className="text-xs text-muted-foreground italic font-body py-2">No statements recorded</p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {roundSummary && (
                          <RoundSummaryCard
                            summary={roundSummary.summary}
                            keyArguments={roundSummary.key_arguments}
                            subtopicTitle={st.title}
                          />
                        )}
                        {stTranscripts.map((entry) => (
                          <TranscriptCard
                            key={entry.id}
                            entryId={entry.id}
                            speakerSide={entry.speaker_side}
                            sideOrder={getSideOrder(entry.speaker_side)}
                            text={entry.text}
                            aiSummary={entry.ai_summary}
                            timestamp={entry.timestamp}
                          />
                        ))}
                        {orphanArgs.map((arg) => {
                          const participant = participants.find((p) => p.id === arg.participant_id);
                          const side = sides.find((s) => s.id === participant?.side_id);
                          return (
                            <TranscriptCard
                              key={arg.id}
                              argumentId={arg.id}
                              speakerSide={side?.label || "Unknown"}
                              sideOrder={side?.sort_order ?? 0}
                              text={arg.content}
                            />
                          );
                        })}
                      </div>
                    );
                  }}
                  footer={
                    <div className="text-center py-8">
                      <h3 className="text-xl font-display font-bold text-primary mb-2">Debate Complete</h3>
                      <p className="text-muted-foreground text-sm font-body">
                        {debate.edit_window_ends_at && new Date(debate.edit_window_ends_at).getTime() > Date.now()
                          ? "Participants may edit their arguments before the record is finalized."
                          : "The debate record is permanently finalized."}
                      </p>
                    </div>
                  }
                >
                  <div className="mt-8">
                    <RecordCommentsSection
                      recordType={(debate as any).format === "change_my_mind" ? "change_my_mind" : "debate"}
                      recordId={debate.id}
                    />
                  </div>
                </DebateRecordShell>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar is now integrated into ParticipantSharedView */}
      </div>
      {user && id && (
        <RecordToolsMount
          recordType="debate"
          recordId={id}
          transcriptEntries={transcriptEntries.map((e: any) => ({
            id: e.id,
            speaker_id: 0,
            speaker_label: e.speaker_side,
            text: e.text,
            subtopic: e.subtopic,
            timestamp: e.timestamp,
            is_final: e.is_final,
            ai_summary: e.ai_summary,
          }))}
          subtopics={subtopics.map((s: any) => s.title)}
        />
      )}
    </div>
  );
};

export default DebateRoomPage;

/* ── Spectator-only preview shell ──
   Mirrors the threaded record (with live or ghost data) so visitors
   browsing from Explore can see the shape of the debate. */
function SpectatorPreviewShell({
  debate,
  navigate,
  userId,
}: {
  debate: any;
  navigate: ReturnType<typeof useNavigate>;
  userId: string | null;
}) {
  const [publisherName, setPublisherName] = useState<string>("");
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sides, setSides] = useState<{ id: string; label: string; sort_order: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (debate?.created_by) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", debate.created_by)
          .maybeSingle();
        if (!cancelled) setPublisherName(prof?.display_name || "Publisher");
      }
      const { count } = await supabase
        .from("debate_participants")
        .select("id", { count: "exact", head: true })
        .eq("debate_id", debate.id);
      if (!cancelled) setParticipantCount(count || 0);
      const { data: sds } = await supabase
        .from("debate_sides")
        .select("id,label,sort_order")
        .eq("debate_id", debate.id)
        .order("sort_order");
      if (!cancelled) setSides((sds as any) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [debate?.id, debate?.created_by]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <DebateRecordPreview
          debateId={debate.id}
          topic={debate.topic}
          description={debate.description}
          status={debate.status}
          scheduledAt={debate.scheduled_at}
          coverImageUrl={debate.cover_image_url}
          publisherName={publisherName}
          participantCount={participantCount}
          fallbackSideLabels={sides.map((s) => s.label)}
        />

        <div className="mt-8">
          <RecordCommentsSection
            recordType={(debate as any).format === "change_my_mind" ? "change_my_mind" : "debate"}
            recordId={debate.id}
          />
        </div>

        {userId && userId !== debate.created_by && (
          <div className="mt-8 sticky bottom-4 z-10">
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-body font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              <HandHeart className="w-4 h-4" />
              Interested?
            </button>
          </div>
        )}
      </div>

      {userId && userId !== debate.created_by && (
        <InterestedComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          debateId={debate.id}
          debateTopic={debate.topic}
          publisherId={debate.created_by}
          publisherName={publisherName}
          sides={sides.map((s) => ({ id: s.id, label: s.label }))}
        />
      )}
    </AppLayout>
  );
}
