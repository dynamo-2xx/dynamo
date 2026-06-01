import { useState } from "react";
import { Play, Pause, SkipForward, ChevronRight, Zap, Plus, PanelRightOpen, PanelRightClose, Monitor, Radio, Map as MapIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DebateTimer from "./DebateTimer";
import LiveArgumentMap from "./LiveArgumentMap";
import TranscriptCard from "./TranscriptCard";
import DLogoButton from "./DLogoButton";
import IconCircleButton from "./IconCircleButton";
import ArgumentMapOverlay from "./ArgumentMapOverlay";
import type { TranscriptEntry, ArgumentMapEntry } from "@/hooks/useDeepgramTranscription";

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

interface FacilitatorViewProps {
  debateId: string;
  debate: {
    current_subtopic_index: number;
    current_turn: number;
    current_speaker_side_id: string | null;
    turns_per_subtopic: number;
    time_per_turn: string;
  };
  sides: Side[];
  subtopics: Subtopic[];
  arguments: Argument[];
  participants: Participant[];
  timeLeft: number;
  timerRunning: boolean;
  aiMessage: string;
  aiLoading: boolean;
  transcriptEntries?: TranscriptEntry[];
  deepgramConnected?: boolean;
  interimText?: string;
  aiMessageCollapsed?: boolean;
  aiMessagePulse?: boolean;
  onToggleAiMessage?: () => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onExtendTime: () => void;
  onSkipTurn: () => void;
  onNextTurn: () => void;
}

const FacilitatorView = ({
  debateId, debate, sides, subtopics, arguments: args, participants,
  timeLeft, timerRunning, aiMessage, aiLoading,
  transcriptEntries = [], deepgramConnected, interimText,
  aiMessageCollapsed = false, aiMessagePulse = false, onToggleAiMessage,
  onToggleTimer, onResetTimer, onExtendTime, onSkipTurn, onNextTurn,
}: FacilitatorViewProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [argumentMapOpen, setArgumentMapOpen] = useState(false);
  const currentSubtopic = subtopics[debate.current_subtopic_index ?? 0];
  const currentSide = sides.find((s) => s.id === debate.current_speaker_side_id) || sides[0];
  const currentSubtopicArgs = args.filter((a) => a.subtopic_id === currentSubtopic?.id);

  const currentSpeakers = participants.filter(
    (p) => p.side_id === currentSide?.id && p.participant_role === "speaker"
  );

  const mapArgs = currentSubtopicArgs.map((a) => {
    const participant = participants.find((p) => p.id === a.participant_id);
    const side = sides.find((s) => s.id === participant?.side_id);
    return {
      id: a.id, content: a.content, argumentType: a.argument_type,
      sideLabel: side?.label || "Unknown", sideOrder: side?.sort_order ?? 0,
      participantId: a.participant_id, parentArgumentId: a.parent_argument_id,
      createdAt: a.created_at, isEdited: a.is_edited,
    };
  });

  const turnQueue = sides.map((side, idx) => {
    const sideIdx = sides.findIndex((s) => s.id === debate.current_speaker_side_id);
    const isActive = side.id === debate.current_speaker_side_id;
    const isNext = (sideIdx + 1) % sides.length === idx;
    return { ...side, isActive, isNext };
  });

  const getSideOrder = (sideLabel: string): number => {
    const side = sides.find((s) => s.label.toLowerCase() === sideLabel.toLowerCase());
    return side?.sort_order ?? 0;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main panel */}
      <div className="flex-1 flex flex-col relative">
        {/* Argument map overlay */}
        <ArgumentMapOverlay
          open={argumentMapOpen}
          onClose={() => setArgumentMapOpen(false)}
          arguments={currentSubtopicArgs.map((a) => {
            const p = participants.find((p) => p.id === a.participant_id);
            const side = sides.find((s) => s.id === p?.side_id);
            return {
              id: a.id, content: a.content, argumentType: a.argument_type,
              sideLabel: side?.label || "Unknown", sideOrder: side?.sort_order ?? 0,
              participantId: a.participant_id, parentArgumentId: a.parent_argument_id,
              createdAt: a.created_at, isEdited: a.is_edited,
            };
          })}
          subtopicTitle={currentSubtopic?.title}
        />
        {/* Speaker + Timer section */}
        <div className="border-b border-border bg-card px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-1">Current Speaker</p>
              <h2 className="text-3xl font-display font-bold text-foreground">{currentSide?.label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {currentSpeakers.length} speaker{currentSpeakers.length !== 1 ? "s" : ""} · Side {(currentSide?.sort_order ?? 0) + 1}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open(`/debate/${debateId}/projector`, '_blank')}
                className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
                title="Open Projector Mode"
              >
                <Monitor className="w-4 h-4" /> Projector
              </button>
              <div className="flex flex-col items-center gap-1.5">
                {aiMessage && onToggleAiMessage && (
                  <DLogoButton
                    onClick={onToggleAiMessage}
                    active={!aiMessageCollapsed}
                    pulse={aiMessagePulse}
                  />
                )}
                {currentSubtopicArgs.length > 0 && (
                  <IconCircleButton
                    onClick={() => setArgumentMapOpen((v) => !v)}
                    active={argumentMapOpen}
                    title="Argument map"
                    ariaLabel="Toggle argument map overlay"
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                  </IconCircleButton>
                )}
              </div>
              <DebateTimer timeLeft={timeLeft} size="lg" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-display font-semibold text-primary">{currentSubtopic?.title}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Subtopic {(debate.current_subtopic_index ?? 0) + 1}/{subtopics.length} · Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Queue:</span>
            {turnQueue.map((side) => (
              <span
                key={side.id}
                className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${
                  side.isActive ? "bg-primary text-primary-foreground" : side.isNext ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {side.label}
              </span>
            ))}
          </div>
        </div>

        {/* AI message — auto-collapses 5s after streaming completes */}
        <AnimatePresence>
          {aiMessage && !aiMessageCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-primary/20 bg-primary/5 px-6 py-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary mb-1 font-display">D.</p>
                  <p className="text-sm text-foreground leading-relaxed font-body">{aiMessage}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="border-b border-border bg-card/50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onToggleTimer} className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {timerRunning ? "Pause" : "Resume"}
            </button>
            <button onClick={onExtendTime} className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Plus className="w-4 h-4" /> Extend Time
            </button>
            <button onClick={onSkipTurn} className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <SkipForward className="w-4 h-4" /> Skip Turn
            </button>
          </div>
          <button
            onClick={onNextTurn}
            disabled={aiLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {aiLoading ? "Processing…" : <><SkipForward className="w-4 h-4" /> Next Turn</>}
          </button>
        </div>

        {/* Scrollable argument area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Live Argument Feed — {currentSubtopic?.title}
          </h3>
          {subtopics.map((st) => {
            const stArgs = args.filter((a) => a.subtopic_id === st.id);
            if (stArgs.length === 0 && st.id !== currentSubtopic?.id) return null;
            const stMapArgs = stArgs.map((a) => {
              const p = participants.find((p) => p.id === a.participant_id);
              const side = sides.find((s) => s.id === p?.side_id);
              return {
                id: a.id, content: a.content, argumentType: a.argument_type,
                sideLabel: side?.label || "Unknown", sideOrder: side?.sort_order ?? 0,
                participantId: a.participant_id, parentArgumentId: a.parent_argument_id,
                createdAt: a.created_at, isEdited: a.is_edited,
              };
            });
            return (
              <div key={st.id} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-display font-semibold text-primary">{st.title}</span>
                </div>
                <LiveArgumentMap arguments={stMapArgs} compact />
              </div>
            );
          })}
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="hidden lg:flex items-center justify-center w-8 border-l border-border bg-card/50 hover:bg-accent transition-colors shrink-0"
        aria-label={sidebarOpen ? "Collapse panel" : "Expand panel"}
      >
        {sidebarOpen ? <PanelRightClose className="w-4 h-4 text-muted-foreground" /> : <PanelRightOpen className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Right sidebar — live transcript */}
      {sidebarOpen && (
        <aside className="hidden lg:flex flex-col w-80 border-l border-border bg-card/50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Live Transcript
              </h3>
              {deepgramConnected && (
                <span className="flex items-center gap-1 text-[9px] text-primary font-semibold">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {transcriptEntries.filter(e => e.is_final).length === 0 && !interimText && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[10px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Waiting for speech…
                </span>
              </div>
            )}
            {transcriptEntries.filter(e => e.is_final).map((entry) => (
              <TranscriptCard
                key={entry.id}
                speakerSide={entry.speaker_side}
                sideOrder={getSideOrder(entry.speaker_side)}
                text={entry.text}
                aiSummary={entry.ai_summary}
                timestamp={entry.timestamp}
                compact
              />
            ))}
            {interimText && (
              <div className="mt-2 text-[10px] text-muted-foreground italic font-body px-2 py-1 bg-muted/50 rounded">
                🎙 {interimText}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default FacilitatorView;
