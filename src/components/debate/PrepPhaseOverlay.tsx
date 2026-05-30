import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit3, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArgumentMapContent, {
  type TranscriptEntryInput,
  type ArgumentMapEntryInput,
  type SubtopicInput,
} from "./ArgumentMapContent";
import PrepNotebookPanel from "./PrepNotebookPanel";

interface TranscriptEntry {
  id: string;
  text: string;
  speaker_side: string;
  subtopic: string;
  timestamp: number;
  is_final: boolean;
  ai_summary?: string;
}

interface PrepPhaseOverlayProps {
  role: "incoming" | "outgoing";
   prepTimeMin?: number;
   prepTimeMax: number;
  lastTranscript?: string;
  lastAiSummary?: string;
  speakerSideLabel: string;
  onPrepTimeSelected?: (seconds: number) => void;
   onSummaryEdited?: (newSummary: string) => void;
  onReady?: () => void;
  prepStartedAt?: number;
  selectedPrepDuration?: number;
  // New props for 3-column incoming prep
  allTranscriptEntries?: TranscriptEntry[];
  subtopics?: Array<{ id: string; title: string }>;
  sides?: Array<{ id: string; label: string }>;
  isSummaryBeingEdited?: boolean;
  notebookValue?: string;
  onNotebookChange?: (val: string) => void;
  /** Argument-map entries across the whole debate (drives the left column). */
  argumentMap?: ArgumentMapEntryInput[];
  /** Backing record for the notebook panel — both required to mount it. */
  recordType?: "debate" | "live_session" | "change_my_mind";
  recordId?: string;
  /** Inline-edit handlers for argument-map bubbles (prep window only). */
  onEditArgumentMapEntry?: (id: string, newContent: string) => void | Promise<void>;
  onRevertArgumentMapEntry?: (id: string) => void | Promise<void>;
  /** Facilitator pause state — freezes the prep countdown when true. */
  isPaused?: boolean;
  /** ISO timestamp of when the pause began (used to compute pause duration). */
  pausedAt?: string | null;
}

function parseTimeLabel(seconds: number): string {
  if (seconds >= 60) {
    const mins = seconds / 60;
    return mins % 1 === 0 ? `${mins} min` : `${mins.toFixed(1)} min`;
  }
  return `${seconds}s`;
}


const PrepPhaseOverlay = ({
  role,
  prepTimeMin,
  prepTimeMax,
  lastTranscript,
  lastAiSummary,
  speakerSideLabel,
   onSummaryEdited,
  onReady,
  prepStartedAt,
  selectedPrepDuration,
  isSummaryBeingEdited,
  allTranscriptEntries = [],
  subtopics = [],
  argumentMap = [],
  recordType,
  recordId,
  onEditArgumentMapEntry,
  onRevertArgumentMapEntry,
  isPaused = false,
  pausedAt = null,
}: PrepPhaseOverlayProps) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(prepTimeMax);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [markedReady, setMarkedReady] = useState(false);
  const [leftTab, setLeftTab] = useState<"threaded" | "transcript">("threaded");
  const syncedDuration = selectedPrepDuration || selectedTime;
  const hasPrepTimerStarted = Boolean(prepStartedAt && syncedDuration);
  // Tracks total ms spent paused so far in this prep window. Each completed
  // pause adds (resumeTime - pauseTime) and the countdown subtracts the live
  // pause delta while paused.
  const [accumulatedPauseMs, setAccumulatedPauseMs] = useState(0);
  const [pauseStartMs, setPauseStartMs] = useState<number | null>(null);

  // Capture pause start; on resume, fold the elapsed pause time into the total.
  useEffect(() => {
    if (isPaused && pausedAt) {
      const start = new Date(pausedAt).getTime();
      setPauseStartMs(start);
    } else if (!isPaused && pauseStartMs != null) {
      setAccumulatedPauseMs((prev) => prev + (Date.now() - pauseStartMs));
      setPauseStartMs(null);
    }
  }, [isPaused, pausedAt, pauseStartMs]);

  // Reset pause accumulation whenever a new prep window starts.
  useEffect(() => {
    setAccumulatedPauseMs(0);
    setPauseStartMs(null);
  }, [prepStartedAt]);

  useEffect(() => {
    if (!prepStartedAt) return;
    const duration = syncedDuration;
    if (!duration) return;

    const interval = setInterval(() => {
      const livePauseMs =
        isPaused && pauseStartMs != null ? Date.now() - pauseStartMs : 0;
      const pausedMsTotal = accumulatedPauseMs + livePauseMs;
      const elapsed = Math.floor(
        (Date.now() - prepStartedAt - pausedMsTotal) / 1000,
      );
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0 && !isPaused) {
        clearInterval(interval);
        if (!markedReady) {
          setMarkedReady(true);
          onReady?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    prepStartedAt,
    syncedDuration,
    onReady,
    markedReady,
    isPaused,
    pauseStartMs,
    accumulatedPauseMs,
  ]);

  const handleReady = () => {
    if (markedReady) return;
    setMarkedReady(true);
    onReady?.();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const stList: SubtopicInput[] = subtopics.map((s) => ({ id: s.id, title: s.title }));
  const tList: TranscriptEntryInput[] = allTranscriptEntries.map((e) => ({
    id: e.id,
    speaker_side: e.speaker_side,
    text: e.text,
    subtopic: e.subtopic,
    timestamp: e.timestamp,
    ai_summary: e.ai_summary,
  }));

  const leftTabBtn = (id: "threaded" | "transcript", label: string) => (
    <button
      type="button"
      onClick={() => setLeftTab(id)}
      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
        leftTab === id ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  const argumentMapColumn = (
    <div className="bg-card border border-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="border-b border-border px-3 py-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Argument map
        </p>
        <div className="flex items-center gap-1">
          {leftTabBtn("threaded", "Threaded Record")}
          {leftTabBtn("transcript", "Transcript")}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3">
        <ArgumentMapContent
          tab={leftTab}
          subtopics={stList}
          transcriptEntries={tList}
          argumentMap={argumentMap}
          inline
          editable={Boolean(onEditArgumentMapEntry)}
          onEditEntry={onEditArgumentMapEntry}
          onRevertEntry={onRevertArgumentMapEntry}
        />
      </div>
    </div>
  );

  const notebookColumn = recordType && recordId ? (
    <div className="h-full min-h-0">
      <PrepNotebookPanel recordType={recordType} recordId={recordId} />
    </div>
  ) : (
    <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
      Notebook unavailable in this preview.
    </div>
  );

  const readyButtonJsx = (
    <Button
      onClick={handleReady}
      disabled={markedReady}
      className="mt-4 gap-2"
      size="lg"
    >
      {markedReady ? (
        <>
          <Check className="w-4 h-4" /> Waiting for other side…
        </>
      ) : (
        <>
          <ArrowRight className="w-4 h-4" /> I'm Ready
        </>
      )}
    </Button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm flex items-center justify-center overflow-hidden py-4"
    >
      <div className="w-full h-full mx-4 max-w-7xl flex flex-col">
        {/* INCOMING: 3-column prep workspace */}
        {role === "incoming" && selectedTime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col gap-3 min-h-0"
          >
            {/* Header + Timer */}
            <div className="text-center shrink-0">
              <h2 className="text-lg font-display font-bold text-foreground mb-1">
                Preparation Time
              </h2>
              {timeRemaining !== null && (
                <div className="text-4xl font-display font-bold text-primary mb-1">
                  {formatTime(timeRemaining)}
                </div>
              )}
              <p className="text-sm text-muted-foreground font-body">
                {hasPrepTimerStarted
                  ? `Review the full record on the left and capture your notes on the right.`
                  : "Waiting for the other side to choose the prep time."}
              </p>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
              {argumentMapColumn}
              {notebookColumn}
            </div>

            {hasPrepTimerStarted && (
              <div className="text-center shrink-0">{readyButtonJsx}</div>
            )}
          </motion.div>
        )}

        {/* OUTGOING: Side-by-side review */}
        {role === "outgoing" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col gap-3 min-h-0"
          >
            {/* Header */}
            <div className="text-center shrink-0">
              <Edit3 className="w-8 h-8 text-primary mx-auto mb-3" />
              <h2 className="text-lg font-display font-bold text-foreground mb-1">
                Review & Refine
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {hasPrepTimerStarted
                  ? "Hover any bubble in the Argument Map to edit its wording. Transcript stays untouched."
                  : "Waiting for the other side to choose the prep time."}
              </p>
              {timeRemaining !== null && (
                <div className="text-2xl font-display font-bold text-primary mt-2">
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
              {argumentMapColumn}
              {notebookColumn}
            </div>

            <div className="text-center shrink-0">{readyButtonJsx}</div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default PrepPhaseOverlay;
