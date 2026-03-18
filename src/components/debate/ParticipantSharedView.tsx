import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, Mic, Send, SkipForward } from "lucide-react";
import DebateTimer from "./DebateTimer";
import LiveArgumentMap from "./LiveArgumentMap";
import MediaPermissions from "./MediaPermissions";
import SpeechInput, { type SpeechInputHandle } from "./SpeechInput";
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
  // Speaker input props
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
}

const ParticipantSharedView = ({
  debate, sides, subtopics, arguments: args, participants,
  timeLeft, aiMessage,
  canSpeak, isMyTurn, isSpeaker, userId, micEnabled, isRecording,
  argumentText, submitting, speechRef, currentSide,
  onArgumentTextChange, onSetRecording, onSubmit,
}: ParticipantSharedViewProps) => {
  const currentSubtopic = subtopics[debate.current_subtopic_index ?? 0];
  const activeSide = sides.find((s) => s.id === debate.current_speaker_side_id) || sides[0];

  // Map all arguments for the argument map
  const allMapArgs = args.map((a) => {
    const p = participants.find((p) => p.id === a.participant_id);
    const side = sides.find((s) => s.id === p?.side_id);
    return {
      id: a.id, content: a.content, argumentType: a.argument_type,
      sideLabel: side?.label || "Unknown", sideOrder: side?.sort_order ?? 0,
      participantId: a.participant_id, parentArgumentId: a.parent_argument_id,
      createdAt: a.created_at, isEdited: a.is_edited,
    };
  });

  const currentSubtopicMapArgs = allMapArgs.filter(
    (a) => args.find((arg) => arg.id === a.id)?.subtopic_id === currentSubtopic?.id
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero: Speaker + Timer — designed for projection, large and readable */}
      <div className="bg-card border-b border-border px-8 py-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-body mb-2">
          Now Speaking
        </p>
        <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          {activeSide?.label}
        </h2>

        <div className="flex justify-center mb-4">
          <DebateTimer timeLeft={timeLeft} size="xl" />
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="bg-primary/10 rounded-lg px-4 py-1.5">
            <span className="text-sm font-display font-semibold text-primary">
              {currentSubtopic?.title}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
          </span>
        </div>
      </div>

      {/* AI message */}
      <AnimatePresence>
        {aiMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-primary/20 bg-primary/5 px-6 py-4"
          >
            <div className="flex items-start gap-3 max-w-2xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary mb-1 font-display">d.</p>
                <p className="text-sm text-foreground leading-relaxed font-body">{aiMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live argument map building below */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-w-3xl mx-auto w-full">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          <ChevronRight className="w-3.5 h-3.5 inline mr-1 text-primary" />
          {currentSubtopic?.title} — Live Argument Map
        </h3>
        <LiveArgumentMap arguments={currentSubtopicMapArgs} />
      </div>

      {/* Speaker input area */}
      {canSpeak && (
        <div className="border-t border-border bg-card px-4 py-3">
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
        </div>
      )}

      {/* Waiting message */}
      {isSpeaker && !isMyTurn && (
        <div className="border-t border-border bg-card/50 px-4 py-3 text-center text-sm text-muted-foreground font-body">
          Waiting for {currentSide?.label} to respond…
        </div>
      )}
    </div>
  );
};

export default ParticipantSharedView;
