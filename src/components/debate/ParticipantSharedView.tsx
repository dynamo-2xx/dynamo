import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Mic, Send, SkipForward, ChevronDown,
  Users, Columns2, Pause, Play, Plus, ChevronRight,
  Video, VideoOff,
} from "lucide-react";
import DebateTimer from "./DebateTimer";
import MessengerChat from "./MessengerChat";
import SpeechInput, { type SpeechInputHandle } from "./SpeechInput";
import TranscriptCard from "./TranscriptCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefObject } from "react";
import type { TranscriptEntry } from "@/hooks/useDeepgramTranscription";

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
  interimText?: string;
  onArgumentTextChange: (text: string) => void;
  onSetRecording: (val: boolean) => void;
  onSubmit: () => void;
  onEndTurnEarly: () => void;
  onToggleTimer?: () => void;
  onExtendTime?: () => void;
  onSkipTurn?: () => void;
  onNextSubtopic?: () => void;
}

const ParticipantSharedView = ({
  debate, sides, subtopics, arguments: args, participants,
  timeLeft, aiMessage,
  canSpeak, isMyTurn, isSpeaker, userId, micEnabled, isRecording,
  argumentText, submitting, speechRef, currentSide,
  isPublisher, timerRunning,
  transcriptEntries = [], deepgramConnected, interimText,
  onArgumentTextChange, onSetRecording, onSubmit, onEndTurnEarly,
  onToggleTimer, onExtendTime, onSkipTurn, onNextSubtopic,
}: ParticipantSharedViewProps) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

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
      } catch {}
    }
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

    return items.sort((a, b) => a.timestamp - b.timestamp);
  };

  const bothOff = !localCameraOn && !remoteCameraOn;
  const bothOn = localCameraOn && remoteCameraOn;
  const onlyLocalOn = localCameraOn && !remoteCameraOn;
  const onlyRemoteOn = !localCameraOn && remoteCameraOn;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">Speaking</p>
            <h2 className="text-xl font-display font-bold text-foreground">{activeSide?.label}</h2>
          </div>
          <div className="bg-primary/10 rounded-lg px-3 py-1">
            <span className="text-xs font-display font-semibold text-primary">{currentSubtopic?.title}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DebateTimer timeLeft={timeLeft} size="md" />
          {/* Camera toggle — always available for participants */}
          {isSpeaker && (
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-lg transition-colors ${
                localCameraOn
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              title={localCameraOn ? "Turn camera off" : "Turn camera on"}
            >
              {localCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar (split view)"}
          >
            <Columns2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Publisher facilitator controls */}
      {isPublisher && (
        <div className="border-b border-border bg-card/50 px-4 py-2 flex items-center gap-2 shrink-0">
          <button onClick={onToggleTimer} className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {timerRunning ? "Pause" : "Resume"}
          </button>
          <button onClick={onExtendTime} className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Extend
          </button>
          <button onClick={onSkipTurn} className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <SkipForward className="w-3.5 h-3.5" /> Skip Turn
          </button>
          <button onClick={onNextSubtopic} className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <ChevronRight className="w-3.5 h-3.5" /> Next Subtopic
          </button>
        </div>
      )}

      {/* AI message */}
      <AnimatePresence>
        {aiMessage && (
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

      {/* Main content area: main box + sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        {/* Main box — 80% width */}
        <div className="w-[80%] flex flex-col min-h-0 overflow-hidden">
          {/* Both cameras off → show live thread */}
          {bothOff && (
            <div className="flex-1 flex flex-col min-h-0">
              <MessengerChat messages={chatMessages} />
            </div>
          )}
          {/* Both cameras on → split 50/50 */}
          {bothOn && (
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 bg-muted relative overflow-hidden">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 bg-background/70 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">You</span>
              </div>
              <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-xs border-l border-border">
                Remote Camera Feed
              </div>
            </div>
          )}
          {/* Only local camera on → fullscreen local feed */}
          {onlyLocalOn && (
            <div className="flex-1 bg-muted relative overflow-hidden min-h-0">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <span className="absolute bottom-2 left-2 bg-background/70 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">You</span>
            </div>
          )}
          {/* Only remote camera on → fullscreen remote feed */}
          {onlyRemoteOn && (
            <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-xs min-h-0">
              Remote Camera Feed
            </div>
          )}
        </div>

        {/* Sidebar — argument map organized by subtopic dropdowns */}
        <aside className="w-[20%] border-l border-border bg-card/50 flex flex-col min-h-0 overflow-hidden">
          {/* Participants */}
          <div className="border-b border-border p-3 shrink-0">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 font-body">
              <Users className="w-3 h-3 inline mr-1" /> Participants
            </h3>
            <div className="space-y-1.5">
              {sides.map((side) => (
                <div key={side.id}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                    side.sort_order === 0 ? "text-[hsl(var(--side-1))]" : "text-[hsl(var(--side-2))]"
                  }`}>{side.label}</p>
                  {participants.filter((p) => p.side_id === side.id).map((p) => (
                    <div key={p.id} className="text-[11px] text-foreground flex items-center gap-1 font-body ml-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        side.sort_order === 0 ? "bg-[hsl(var(--side-1))]" : "bg-[hsl(var(--side-2))]"
                      }`} />
                      {p.user_id === userId ? "You" : p.user_id.slice(0, 8)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Argument Map header */}
          <div className="border-b border-border p-3 shrink-0">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-body">
              Argument Map
            </h3>
          </div>

          {/* Subtopic dropdowns with argument map cards */}
          <div className="flex-1 p-2 space-y-1 overflow-y-auto min-h-0">
            {subtopics.map((st, stIdx) => {
              const items = getSubtopicItems(st);
              const isCurrent = stIdx === (debate.current_subtopic_index ?? 0);

              return (
                <Collapsible key={st.id} defaultOpen={isCurrent}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent/50 transition-colors">
                    <ChevronDown className="w-3 h-3 text-primary shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                    <span className={`text-[10px] font-semibold uppercase tracking-wider flex-1 ${
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {st.title}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[9px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">
                        {items.length}
                      </span>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-2 pr-1 pb-2 space-y-1.5">
                      {items.map((item) => (
                        <TranscriptCard
                          key={item.id}
                          speakerSide={item.speakerSide}
                          sideOrder={item.sideOrder}
                          text={item.text}
                          aiSummary={item.aiSummary}
                          timestamp={item.timestamp}
                          compact
                          autoFlip
                        />
                      ))}
                      {items.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic font-body py-2 px-2">
                          No statements yet
                        </p>
                      )}
                      {/* Interim text for current subtopic */}
                      {isCurrent && interimText && (
                        <div className="text-[10px] text-muted-foreground italic font-body px-2 py-1 bg-muted/50 rounded">
                          🎙 {interimText}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Fixed input area at bottom — text input only (mic goes directly to argument map via Deepgram) */}
      {canSpeak && (
        <div className="border-t border-border bg-card px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium font-body">
              It's your turn — speech is transcribed automatically · type below to submit text
            </span>
          </div>
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <div className="flex-1 flex items-end gap-2">
              <textarea
                value={argumentText}
                onChange={(e) => onArgumentTextChange(e.target.value)}
                placeholder="Type your argument here…"
                rows={2}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-body"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
                }}
              />
              <button
                onClick={onSubmit}
                disabled={!argumentText.trim() || submitting}
                className="bg-primary text-primary-foreground p-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-2 max-w-3xl mx-auto">
            <button
              onClick={onEndTurnEarly}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              <SkipForward className="w-3.5 h-3.5" />
              End my turn early
            </button>
          </div>
        </div>
      )}

      {/* Waiting message */}
      {isSpeaker && !isMyTurn && (
        <div className="border-t border-border bg-card/50 px-4 py-3 text-center text-sm text-muted-foreground font-body shrink-0">
          Waiting for {currentSide?.label} to respond…
        </div>
      )}
    </div>
  );
};

export default ParticipantSharedView;
