import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Mic, MicOff, Send, SkipForward, ChevronDown,
  Users, Pause, Play,
  Video, VideoOff, Maximize2, Minimize2, Map as MapIcon, BookOpen,
} from "lucide-react";
import DebateTimer from "./DebateTimer";
import MessengerChat from "./MessengerChat";
import SpeechInput, { type SpeechInputHandle } from "./SpeechInput";
import TranscriptCard from "./TranscriptCard";
import RoundSummaryCard from "./RoundSummaryCard";
import DLogoButton from "./DLogoButton";
import IconCircleButton from "./IconCircleButton";
import ArgumentMapOverlay from "./ArgumentMapOverlay";
import FloatingIntelligence from "@/components/insights/FloatingIntelligence";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefObject } from "react";
import type { TranscriptEntry } from "@/hooks/useDeepgramTranscription";
import { toast } from "sonner";
import { useSpeakerPause } from "@/hooks/useSpeakerPause";

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

interface ParticipantSharedViewProps {
  debate: {
    id: string;
    current_subtopic_index: number;
    current_turn: number;
    current_speaker_side_id: string | null;
    turns_per_subtopic: number;
  };
  sides: Side[];
  subtopics: Subtopic[];
  arguments: Argument[];
  participants: Participant[];
  timeLeft: number;
  aiMessage: string;
  aiMessageCollapsed?: boolean;
  aiMessagePulse?: boolean;
  onToggleAiMessage?: () => void;
  canSpeak: boolean;
  isMyTurn: boolean;
  isSpeaker: boolean;
  userId: string | undefined;
  micEnabled: boolean;
  isRecording: boolean;
  argumentText: string;
  submitting: boolean;
  speechRef: RefObject<SpeechInputHandle | null>;
  currentSide: Side | undefined;
  isPublisher?: boolean;
  timerRunning?: boolean;
  transcriptEntries?: TranscriptEntry[];
  deepgramConnected?: boolean;
  deepgramActive?: boolean;
  interimText?: string;
  onArgumentTextChange: (text: string) => void;
  onSetRecording: (val: boolean) => void;
  onSubmit: () => void;
  onEndTurnEarly: () => void;
  onToggleDeepgram?: () => void;
  onToggleTimer?: () => void;
  onExtendTime?: () => void;
  onSkipTurn?: () => void;
  onNextSubtopic?: () => void;
  onOpenNotebook?: () => void;
  notebookOpen?: boolean;
  notebookContent?: string;
  onNotebookContentChange?: (val: string) => void;
  onCloseNotebook?: () => void;
  roundSummaries?: Record<string, { summary: string; key_arguments: Array<{ side: string; content: string; type: string; significance: string }> }>;
  /** Full argument-map entries (typed/threaded) for the entire debate. */
  argumentMapEntries?: Array<{ id: string; type: string; speaker_side: string; content: string; quote?: string; parent_index?: number; subtopic: string; created_at: number }>;
}

const ParticipantSharedView = ({
  debate, sides, subtopics, arguments: args, participants,
  timeLeft, aiMessage, aiMessageCollapsed = false, aiMessagePulse = false, onToggleAiMessage,
  canSpeak, isMyTurn, isSpeaker, userId, micEnabled, isRecording,
  argumentText, submitting, speechRef, currentSide,
  isPublisher, timerRunning,
  transcriptEntries = [], deepgramConnected, deepgramActive, interimText,
  onArgumentTextChange, onSetRecording, onSubmit, onEndTurnEarly,
  onToggleDeepgram, onToggleTimer, onExtendTime, onSkipTurn, onNextSubtopic,
  onOpenNotebook,
  notebookOpen = false,
  notebookContent = "",
  onNotebookContentChange,
  onCloseNotebook,
  roundSummaries = {},
  argumentMapEntries = [],
}: ParticipantSharedViewProps) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [argumentMapOpen, setArgumentMapOpen] = useState(false);
  // Local toggle: viewers can flip the top-bar label between
  // "SPEAKING <active side>" and "LISTENING <other side(s)>" so it's always
  // clear which side the camera/transcript belongs to. Purely cosmetic.
  const [showAsListening, setShowAsListening] = useState(false);

  // Server-backed speaker pause (separate from the host's facilitator pause).
  // Persisted on `debates.speaker_paused_at`, gated to one per turn via
  // `speaker_pause_used_turn_key`, with server-trusted 30s auto-resume.
  const turnKey = `${debate.current_subtopic_index}:${debate.current_turn}:${debate.current_speaker_side_id ?? ""}`;
  const {
    isPaused: speakerPauseActive,
    usedThisTurn: pauseUsedThisTurn,
    remainingMs: pauseRemainingMs,
    pause: pauseSpeaker,
    resume: resumeSpeaker,
  } = useSpeakerPause({
    debateId: debate.id,
    turnKey,
    canControl: isSpeaker && isMyTurn,
    ownerId: userId ?? null,
  });

  const handleSpeakerPauseToggle = () => {
    if (speakerPauseActive) void resumeSpeaker();
    else void pauseSpeaker();
  };

  // Publisher-speakers also need the per-turn pause.
  const showSpeakerPause = isSpeaker && isMyTurn;
  const pauseCountdownLabel = `${Math.ceil(pauseRemainingMs / 1000)}s`;

  // Camera state — independently toggleable per participant
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localCameraOn, setLocalCameraOn] = useState(false);
  // Remote camera would be managed via WebRTC in a real implementation
  const [remoteCameraOn] = useState(false);

  // Don't auto-start camera — it's independently toggleable
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [localCameraOn]);

  const toggleCamera = async () => {
    if (localCameraOn) {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStreamRef.current = stream;
        setLocalCameraOn(true);
      } catch {
        toast.error("Camera permission denied. Please allow access in your browser.");
      }
    }
  };

  const handleToggleMic = async () => {
    // First click: request mic permission so the browser prompt happens here, in the console
    if (!deepgramActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the test stream — Deepgram hook acquires its own when activated
        stream.getTracks().forEach(t => t.stop());
      } catch {
        toast.error("Microphone permission denied. Please allow access in your browser.");
        return;
      }
    }
    onToggleDeepgram?.();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  const currentSubtopic = subtopics[debate.current_subtopic_index ?? 0];
  const activeSide = sides.find((s) => s.id === debate.current_speaker_side_id) || sides[0];

  const currentSubtopicArgs = args.filter((a) => a.subtopic_id === currentSubtopic?.id);
  const chatMessages = currentSubtopicArgs.map((a) => {
    const p = participants.find((p) => p.id === a.participant_id);
    const side = sides.find((s) => s.id === p?.side_id);
    return {
      id: a.id,
      content: a.content,
      sideLabel: side?.label || "Unknown",
      sideOrder: side?.sort_order ?? 0,
      createdAt: a.created_at,
      isEdited: a.is_edited,
    };
  });

  const getSideOrder = (sideLabel: string): number => {
    const side = sides.find((s) => s.label.toLowerCase() === sideLabel.toLowerCase());
    return side?.sort_order ?? 0;
  };

  // Merge transcript entries + submitted arguments into unified argument map items per subtopic
  const getSubtopicItems = (subtopic: Subtopic) => {
    const stTranscripts = transcriptEntries.filter(e => e.is_final && e.subtopic === subtopic.title);
    const stArgs = args.filter((a) => a.subtopic_id === subtopic.id);

    // Combine into a unified list sorted by time
    const items: Array<{
      id: string;
      type: "transcript" | "argument";
      speakerSide: string;
      sideOrder: number;
      text: string;
      aiSummary?: string;
      timestamp: number;
    }> = [];

    stTranscripts.forEach(entry => {
      items.push({
        id: entry.id,
        type: "transcript",
        speakerSide: entry.speaker_side,
        sideOrder: getSideOrder(entry.speaker_side),
        text: entry.text,
        aiSummary: entry.ai_summary,
        timestamp: entry.timestamp,
      });
    });

    // Only add submitted arguments that DON'T already have a matching transcript entry
    // (text submissions create both an argument row and a transcript entry for AI summarization)
    const transcriptTexts = new Set(stTranscripts.map(t => t.text.trim().toLowerCase()));
    stArgs.forEach(arg => {
      if (transcriptTexts.has(arg.content.trim().toLowerCase())) return; // skip duplicate
      const participant = participants.find(p => p.id === arg.participant_id);
      const side = sides.find(s => s.id === participant?.side_id);
      items.push({
        id: `arg-${arg.id}`,
        type: "argument",
        speakerSide: side?.label || "Unknown",
        sideOrder: side?.sort_order ?? 0,
        text: arg.content,
        timestamp: new Date(arg.created_at).getTime(),
      });
    });

    // Only show items that have an AI summary in the live sidebar
    return items.filter(item => item.aiSummary && item.aiSummary.trim().length > 0).sort((a, b) => a.timestamp - b.timestamp);
  };

  const bothOff = !localCameraOn && !remoteCameraOn;
  const bothOn = localCameraOn && remoteCameraOn;
  const onlyLocalOn = localCameraOn && !remoteCameraOn;
  const onlyRemoteOn = !localCameraOn && remoteCameraOn;

  // Build argument-map nodes for the overlay (current subtopic only)
  const overlayArgs = currentSubtopicArgs.map((a) => {
    const participant = participants.find((p) => p.id === a.participant_id);
    const side = sides.find((s) => s.id === participant?.side_id);
    return {
      id: a.id,
      content: a.content,
      argumentType: a.argument_type,
      sideLabel: side?.label || "Unknown",
      sideOrder: side?.sort_order ?? 0,
      participantId: a.participant_id,
      parentArgumentId: a.parent_argument_id,
      createdAt: a.created_at,
      isEdited: a.is_edited,
    };
  });

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top bar — speaking context + turn clock only. The d./map/notebook/pause
          control cluster lives in the mobile row and the desktop right cluster
          below; duplicating it here was clunky. */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {(() => {
            const otherSides = sides.filter((s) => s.id !== activeSide?.id);
            const otherLabel = otherSides.map((s) => s.label).join(" · ") || activeSide?.label;
            const eyebrow = showAsListening ? "Listening" : "Speaking";
            const label = showAsListening ? otherLabel : activeSide?.label;
            return (
              <button
                type="button"
                onClick={() => setShowAsListening((v) => !v)}
                aria-pressed={showAsListening}
                title="Flip view"
                className="text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-foreground/[0.04] transition-colors"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">{eyebrow}</p>
                <h2 className="text-xl font-display font-bold text-foreground">{label}</h2>
              </button>
            );
          })()}
          <div className="bg-primary/10 rounded-lg px-3 py-1">
            <span className="text-xs font-display font-semibold text-primary">{currentSubtopic?.title}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
          </span>
        </div>
        <DebateTimer timeLeft={timeLeft} size="md" />
      </div>

      {/* Mobile-only thin row — sits directly above the input for any speaker */}
      {isSpeaker && (
        <div className="sm:hidden border-b border-border bg-card/50 px-4 py-2 flex items-center justify-end gap-1.5 shrink-0">
          {onToggleAiMessage && (
            <DLogoButton
              onClick={onToggleAiMessage}
              active={!aiMessageCollapsed}
              pulse={aiMessagePulse}
              disabled={!aiMessage}
            />
          )}
          <IconCircleButton
            onClick={() => setArgumentMapOpen((v) => !v)}
            active={argumentMapOpen}
            title="Argument map"
            ariaLabel="Toggle argument map overlay"
          >
            <MapIcon className="w-3.5 h-3.5" />
          </IconCircleButton>
          {onOpenNotebook && (
            <IconCircleButton
              onClick={() => (notebookOpen ? onCloseNotebook?.() : onOpenNotebook())}
              active={notebookOpen}
              title="Notebook"
              ariaLabel="Toggle notebook"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </IconCircleButton>
          )}
          {showSpeakerPause && (
            <IconCircleButton
              onClick={handleSpeakerPauseToggle}
              active={speakerPauseActive}
              disabled={timerRunning && pauseUsedThisTurn}
              title={
                speakerPauseActive
                  ? `Resume turn (auto-resume in ${pauseCountdownLabel})`
                  : pauseUsedThisTurn
                  ? "You've already used your pause this turn"
                  : "Pause your turn (30s, one per turn)"
              }
              ariaLabel="Toggle speaker pause"
            >
              {speakerPauseActive ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {speakerPauseActive && (
                <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {pauseCountdownLabel}
                </span>
              )}
            </IconCircleButton>
          )}
        </div>
      )}

      {/* AI message — auto-collapses 5s after streaming completes */}
      <AnimatePresence>
        {aiMessage && !aiMessageCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-primary/20 bg-primary/5 px-4 py-3 shrink-0"
          >
            <div className="flex items-start gap-3 max-w-2xl mx-auto">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-primary mb-0.5 font-display">d.</p>
                <p className="text-xs text-foreground leading-relaxed font-body">{aiMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area: full-width main box with translucent argument-map overlay */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full relative">
        <div className="flex flex-col min-h-0 overflow-hidden w-full relative">
          {/* Both cameras off → show live thread */}
          {bothOff && (
            <div className="flex-1 flex flex-col min-h-0">
              <MessengerChat messages={chatMessages} />
            </div>
          )}
          {/* Both cameras on → split 50/50 */}
          {bothOn && (
            <div className="flex-1 flex min-h-0 relative">
              <div className="flex-1 bg-muted relative overflow-hidden">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 bg-background/70 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">You</span>
              </div>
              <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-xs border-l border-border">
                Remote Camera Feed
              </div>
              {interimText && (
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-4 py-2 text-center z-10">
                  <p className="text-sm text-foreground font-body leading-relaxed">{interimText}</p>
                </div>
              )}
            </div>
          )}
          {/* Only local camera on → fullscreen local feed */}
          {onlyLocalOn && (
            <div className="flex-1 bg-muted relative overflow-hidden min-h-0">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <span className="absolute bottom-2 left-2 bg-background/70 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">You</span>
              {interimText && (
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-4 py-2 text-center">
                  <p className="text-sm text-foreground font-body leading-relaxed">{interimText}</p>
                </div>
              )}
            </div>
          )}
          {/* Only remote camera on → fullscreen remote feed */}
          {onlyRemoteOn && (
            <div className="flex-1 bg-muted relative flex items-center justify-center text-muted-foreground text-xs min-h-0">
              Remote Camera Feed
              {interimText && (
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-4 py-2 text-center">
                  <p className="text-sm text-foreground font-body leading-relaxed">{interimText}</p>
                </div>
              )}
            </div>
          )}

          {/* Translucent argument-map overlay */}
          <ArgumentMapOverlay
            open={argumentMapOpen}
            onClose={() => setArgumentMapOpen(false)}
            subtopicTitle={currentSubtopic?.title}
            subtopics={subtopics.map((s) => ({ id: s.id, title: s.title }))}
            transcriptEntries={transcriptEntries.map((e) => ({
              id: e.id,
              speaker_side: e.speaker_side,
              text: e.text,
              subtopic: e.subtopic,
              timestamp: e.timestamp,
              ai_summary: e.ai_summary,
            }))}
            argumentMap={argumentMapEntries}
            analysis={Object.entries(roundSummaries).map(([sid, v]) => {
              const st = subtopics.find((s) => s.id === sid);
              return {
                subtopicId: sid,
                subtopicTitle: st?.title ?? "",
                summary: v.summary,
                keyArguments: v.key_arguments,
              };
            })}
          />

          {/* §21 Premium Performance Intelligence — floating bubble */}
          <FloatingIntelligence
            sessionId={debate.id}
            sessionKind="debate"
            subtopicId={currentSubtopic?.id ?? null}
          />
        </div>
      </div>

      {/* Fixed input area at bottom. The whole panel renders for any speaker
          (on-turn or off-turn) so camera / notebook / argument-map / d. remain
          accessible all the time. Per-control gating below disables only the
          mic, the text composer, send, and end-turn-early when it isn't this
          speaker's turn — the visual scaffolding never disappears. */}
      {isSpeaker && (
        <div className="border-t border-border bg-card px-4 py-3 shrink-0">
          {/* Facilitator controls live in the header "Facilitation" popover;
              the speaker's per-turn Pause moved into the small icon row below
              alongside d. / argument map / notebook. The bottom panel stays
              focused on the composer + speaker tools only. */}
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            {/* Camera toggle */}
            {isSpeaker && (
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-lg transition-colors shrink-0 ${
                  localCameraOn
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                title={localCameraOn ? "Turn camera off" : "Turn camera on"}
              >
                {localCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            )}
            {/* Mic / Deepgram toggle */}
            <button
              onClick={handleToggleMic}
              disabled={!isMyTurn}
              title={
                !isMyTurn
                  ? "Mic is off — it's not your turn"
                  : deepgramActive
                  ? "Stop live transcription"
                  : "Start live transcription"
              }
              className={`p-3 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                deepgramActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {deepgramActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            {/* Text input */}
            <div className="flex-1 flex items-end gap-2">
              <textarea
                value={argumentText}
                onChange={(e) => onArgumentTextChange(e.target.value)}
                placeholder={isMyTurn ? "Type your argument here…" : "Waiting for your turn…"}
                disabled={!isMyTurn}
                rows={2}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-body disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
                }}
              />
              <button
                onClick={onSubmit}
                disabled={!argumentText.trim() || submitting || !isMyTurn}
                className="bg-primary text-primary-foreground p-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
              {/* Desktop right cluster: d. / map / notebook horizontally (mobile uses the docked row above) */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 self-end">
                {onToggleAiMessage && (
                  <DLogoButton
                    onClick={onToggleAiMessage}
                    active={!aiMessageCollapsed}
                    pulse={aiMessagePulse}
                    disabled={!aiMessage}
                  />
                )}
                <IconCircleButton
                  onClick={() => setArgumentMapOpen((v) => !v)}
                  active={argumentMapOpen}
                  title="Argument map"
                  ariaLabel="Toggle argument map overlay"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                </IconCircleButton>
                {onOpenNotebook && (
                  <IconCircleButton
                    onClick={() => (notebookOpen ? onCloseNotebook?.() : onOpenNotebook())}
                    active={notebookOpen}
                    title="Notebook"
                    ariaLabel="Toggle notebook"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </IconCircleButton>
                )}
                {showSpeakerPause && (
                  <IconCircleButton
                    onClick={handleSpeakerPauseToggle}
                    active={speakerPauseActive}
                    disabled={timerRunning && pauseUsedThisTurn}
                    title={
                      speakerPauseActive
                        ? `Resume turn (auto-resume in ${pauseCountdownLabel})`
                        : pauseUsedThisTurn
                        ? "You've already used your pause this turn"
                        : "Pause your turn (30s, one per turn)"
                    }
                    ariaLabel="Toggle speaker pause"
                  >
                    {speakerPauseActive ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {speakerPauseActive && (
                      <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                        {pauseCountdownLabel}
                      </span>
                    )}
                  </IconCircleButton>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-2 max-w-3xl mx-auto">
            <button
              onClick={onEndTurnEarly}
              disabled={!isMyTurn}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-body disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-3.5 h-3.5" />
              End my turn early
            </button>
          </div>
        </div>
      )}

      {/* Lightweight waiting hint above the composer for off-turn speakers.
          The full control panel is still rendered above so they can keep
          taking notes, exploring the argument map, and toggling camera. */}
      {isSpeaker && !isMyTurn && (
        <div className="border-t border-border bg-card/30 px-4 py-1.5 text-center text-[11px] text-muted-foreground font-body shrink-0">
          Waiting for {currentSide?.label} to respond…
        </div>
      )}
    </div>
  );
};

export default ParticipantSharedView;
