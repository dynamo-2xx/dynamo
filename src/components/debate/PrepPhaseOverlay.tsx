import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit3, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  notebookValue,
  onNotebookChange,
}: PrepPhaseOverlayProps) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(prepTimeMax);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [editedSummary, setEditedSummary] = useState(lastAiSummary || "");
  const [summarySubmitted, setSummarySubmitted] = useState(false);
  const [markedReady, setMarkedReady] = useState(false);
  const [localNotes, setLocalNotes] = useState("");

  const notesValue = notebookValue !== undefined ? notebookValue : localNotes;
  const setNotesValue = onNotebookChange || setLocalNotes;
  const syncedDuration = selectedPrepDuration || selectedTime;
  const hasPrepTimerStarted = Boolean(prepStartedAt && syncedDuration);

  useEffect(() => {
    if (!prepStartedAt) return;
    const duration = syncedDuration;
    if (!duration) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - prepStartedAt) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        if (!markedReady) {
          setMarkedReady(true);
          onReady?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prepStartedAt, syncedDuration, onReady, markedReady]);

  const handleSubmitSummary = () => {
    onSummaryEdited?.(editedSummary);
    setSummarySubmitted(true);
  };

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

  // Prior-turn only: prep window must NOT show the full debate history.
  // Use lastTranscript / lastAiSummary directly. Full history is reachable via the
  // always-on Argument Map button.

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
      className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm flex items-center justify-center overflow-y-auto py-6"
    >
      <div className={`w-full mx-4 ${role === "outgoing" || (role === "incoming" && selectedTime) ? "max-w-6xl" : "max-w-lg"}`}>
        {/* INCOMING: 3-column prep workspace */}
        {role === "incoming" && selectedTime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            {/* Header + Timer */}
            <div className="text-center">
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
                  ? `Review what ${speakerSideLabel || "the previous speaker"} just said and prepare your response. Open the Argument Map for full debate history.`
                  : "Waiting for the other side to choose the prep time."}
              </p>
            </div>

            {/* 2-column grid: prior turn (transcript + summary) | my notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 max-h-[55vh] overflow-y-auto" data-annotatable>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Prior turn{speakerSideLabel ? ` · ${speakerSideLabel}` : ""}
                </p>
                {lastTranscript ? (
                  <p className="text-sm text-foreground font-body leading-relaxed whitespace-pre-wrap mb-3">
                    {lastTranscript}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic font-body mb-3">No transcript captured.</p>
                )}
                {lastAiSummary && (
                  <div className="border-t border-border pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">AI summary</p>
                    <p className="text-xs text-foreground/80 font-body leading-relaxed">{lastAiSummary}</p>
                    {isSummaryBeingEdited && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                        <span className="text-[10px] text-primary font-semibold animate-pulse">Editing…</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  My Notes
                </p>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Write your preparation notes here…"
                  className="flex-1 min-h-[200px] w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Ready button */}
            {hasPrepTimerStarted && (
              <div className="text-center">
                {readyButtonJsx}
              </div>
            )}
          </motion.div>
        )}

        {/* OUTGOING: Side-by-side review */}
        {role === "outgoing" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="text-center">
              <Edit3 className="w-8 h-8 text-primary mx-auto mb-3" />
              <h2 className="text-lg font-display font-bold text-foreground mb-1">
                Review Your Summary
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {hasPrepTimerStarted
                  ? "Verify and edit the AI-generated summary of your statement."
                  : "Waiting for the other side to choose the prep time."}
              </p>
              {timeRemaining !== null && (
                <div className="text-2xl font-display font-bold text-primary mt-2">
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Transcript */}
              <div className="bg-card border border-border rounded-xl p-4 max-h-[50vh] overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Your Transcript
                </p>
                {lastTranscript ? (
                  <p className="text-sm text-foreground font-body leading-relaxed whitespace-pre-wrap">
                    {lastTranscript}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic font-body">
                    No transcript available.
                  </p>
                )}
              </div>

              {/* Right: AI Summary */}
              <div className="bg-card border border-border rounded-xl p-4 max-h-[50vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    AI Summary
                  </p>
                  {summarySubmitted && (
                    <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                {lastAiSummary ? (
                  <>
                    <textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[120px]"
                    />
                    <button
                      onClick={handleSubmitSummary}
                      disabled={summarySubmitted}
                      className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 font-body"
                    >
                      {summarySubmitted ? "Summary Saved" : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic font-body">
                    No AI summary was generated for this input.
                  </p>
                )}
              </div>
            </div>

            {/* Ready button always visible below */}
            <div className="text-center">
              {readyButtonJsx}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default PrepPhaseOverlay;
