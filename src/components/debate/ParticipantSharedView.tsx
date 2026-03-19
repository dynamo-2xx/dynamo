import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Mic, Send, SkipForward, ChevronRight, ChevronDown,
  PanelRightOpen, PanelRightClose, Users, Columns2,
} from "lucide-react";
import DebateTimer from "./DebateTimer";
import MessengerChat from "./MessengerChat";
import MediaPermissions from "./MediaPermissions";
import SpeechInput, { type SpeechInputHandle } from "./SpeechInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefObject } from "react";

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
  onArgumentTextChange: (text: string) => void;
  onSetRecording: (val: boolean) => void;
  onSubmit: () => void;
  onEndTurnEarly: () => void;
}

const ParticipantSharedView = ({
  debate, sides, subtopics, arguments: args, participants,
  timeLeft, aiMessage,
  canSpeak, isMyTurn, isSpeaker, userId, micEnabled, isRecording,
  argumentText, submitting, speechRef, currentSide,
  onArgumentTextChange, onSetRecording, onSubmit, onEndTurnEarly,
}: ParticipantSharedViewProps) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [cameraOn, setCameraOn] = useState(false); // local camera state
  // We don't have remote camera state without WebRTC, so treat as off
  const remoteCameraOn = false;

  const currentSubtopic = subtopics[debate.current_subtopic_index ?? 0];
  const activeSide = sides.find((s) => s.id === debate.current_speaker_side_id) || sides[0];

  // Build chat messages for current subtopic
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

  // Build arguments per subtopic for sidebar
  const argsBySubtopic = (subtopicId: string) =>
    args.filter((a) => a.subtopic_id === subtopicId).map((a) => {
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

  // Determine main box content based on camera states
  const bothOff = !cameraOn && !remoteCameraOn;
  const bothOn = cameraOn && remoteCameraOn;
  const onlyLocalOn = cameraOn && !remoteCameraOn;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top bar: Speaker + Timer */}
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
        <div className="flex items-center gap-3">
          <DebateTimer timeLeft={timeLeft} size="md" />
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar (split view)"}
          >
            <Columns2 className="w-4 h-4" />
          </button>
        </div>
      </div>

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
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main box — fixed size, does not grow */}
        <div className={`flex flex-col overflow-hidden transition-all ${sidebarExpanded ? "w-1/2" : "flex-1"}`}>
          {bothOff && (
            <MessengerChat messages={chatMessages} />
          )}
          {bothOn && (
            <div className="flex-1 flex">
              <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-xs">
                Side 1 Camera Feed
              </div>
              <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-xs border-l border-border">
                Side 2 Camera Feed
              </div>
            </div>
          )}
          {onlyLocalOn && (
            <div className="flex-1 flex">
              <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-xs">
                Your Camera Feed
              </div>
              <div className="flex-1 flex flex-col overflow-hidden border-l border-border">
                <MessengerChat messages={chatMessages} />
              </div>
            </div>
          )}
          {!bothOff && !bothOn && !onlyLocalOn && (
            <MessengerChat messages={chatMessages} />
          )}
        </div>

        {/* Sidebar */}
        <aside className={`border-l border-border bg-card/50 flex flex-col overflow-hidden shrink-0 transition-all ${
          sidebarExpanded ? "w-1/2" : "w-72"
        }`}>
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

          {/* Subtopics with argument dropdowns */}
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 font-body">
              Subtopics & Arguments
            </h3>
            <div className="space-y-1">
              {subtopics.map((st, i) => {
                const isCurrent = i === (debate.current_subtopic_index ?? 0);
                const stArgs = argsBySubtopic(st.id);
                return (
                  <Collapsible key={st.id} defaultOpen={isCurrent}>
                    <CollapsibleTrigger className={`flex items-center gap-1.5 w-full rounded-lg px-2.5 py-1.5 text-xs font-display font-medium transition-colors text-left ${
                      isCurrent
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-secondary/50"
                    }`}>
                      <ChevronDown className="w-3 h-3 shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                      <span className="truncate">{i + 1}. {st.title}</span>
                      {stArgs.length > 0 && (
                        <span className="ml-auto text-[9px] bg-muted rounded-full px-1.5 py-0.5">{stArgs.length}</span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-5 py-1 space-y-1">
                        {stArgs.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic font-body">No arguments yet</p>
                        ) : (
                          stArgs.map((a) => (
                            <div
                              key={a.id}
                              className={`text-[11px] rounded px-2 py-1 border-l-2 font-body ${
                                a.sideOrder === 0
                                  ? "border-l-[hsl(var(--side-1))] bg-[hsl(var(--side-1)/0.05)]"
                                  : "border-l-[hsl(var(--side-2))] bg-[hsl(var(--side-2)/0.05)]"
                              }`}
                            >
                              <span className="font-semibold text-[10px]">{a.sideLabel}: </span>
                              <span className="text-foreground">{a.content}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Fixed input area at bottom */}
      {canSpeak && (
        <div className="border-t border-border bg-card px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium font-body">
              It's your turn — speak or type your argument
            </span>
          </div>
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            {userId && (
              <MediaPermissions
                role="speaker"
                isMicEnabled={micEnabled}
                userId={userId}
                isActivelySpeaking={isRecording}
                variant="inline"
              />
            )}
            <div className="flex-1 flex items-end gap-2">
              <SpeechInput
                ref={speechRef}
                isEnabled={canSpeak}
                onTranscript={(text) => {
                  onArgumentTextChange(text);
                  onSetRecording(true);
                }}
                onFinalTranscript={(text) => onArgumentTextChange(text)}
              />
              <textarea
                value={argumentText}
                onChange={(e) => onArgumentTextChange(e.target.value)}
                placeholder="Speak into your mic or type here…"
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
