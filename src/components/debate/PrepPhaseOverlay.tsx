import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Edit3, Check } from "lucide-react";

interface PrepPhaseOverlayProps {
  role: "incoming" | "outgoing";
  prepTimeMin: number; // seconds
  prepTimeMax: number; // seconds
  lastTranscript?: string;
  lastAiSummary?: string;
  speakerSideLabel: string;
  onPrepTimeSelected?: (seconds: number) => void;
  onSummaryEdited?: (newSummary: string) => void;
  onReady?: () => void;
  prepStartedAt?: number; // timestamp ms
  selectedPrepDuration?: number; // seconds (from incoming speaker)
}

function parseTimeLabel(seconds: number): string {
  if (seconds >= 60) {
    const mins = seconds / 60;
    return mins % 1 === 0 ? `${mins} min` : `${mins.toFixed(1)} min`;
  }
  return `${seconds}s`;
}

const PREP_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

const PrepPhaseOverlay = ({
  role,
  prepTimeMin,
  prepTimeMax,
  lastTranscript,
  lastAiSummary,
  speakerSideLabel,
  onPrepTimeSelected,
  onSummaryEdited,
  onReady,
  prepStartedAt,
  selectedPrepDuration,
}: PrepPhaseOverlayProps) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [editedSummary, setEditedSummary] = useState(lastAiSummary || "");
  const [summarySubmitted, setSummarySubmitted] = useState(false);

  const availableOptions = PREP_OPTIONS.filter(t => t >= prepTimeMin && t <= prepTimeMax);

  // Countdown timer for both roles
  useEffect(() => {
    if (!prepStartedAt) return;

    const duration = role === "outgoing" ? prepTimeMax : (selectedPrepDuration || selectedTime);
    if (!duration) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - prepStartedAt) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onReady?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prepStartedAt, role, prepTimeMax, selectedPrepDuration, selectedTime, onReady]);

  const handleSelectTime = (seconds: number) => {
    setSelectedTime(seconds);
    onPrepTimeSelected?.(seconds);
  };

  const handleSubmitSummary = () => {
    onSummaryEdited?.(editedSummary);
    setSummarySubmitted(true);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm flex items-center justify-center"
    >
      <div className="max-w-lg w-full mx-4">
        {role === "incoming" && !selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Clock className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              Prepare Your Statement
            </h2>
            <p className="text-sm text-muted-foreground font-body mb-6">
              Select how much time you need to prepare your response.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {availableOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSelectTime(t)}
                  className="bg-card border border-border rounded-xl px-6 py-3 text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-colors font-body"
                >
                  {parseTimeLabel(t)}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {role === "incoming" && selectedTime && timeRemaining !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <h2 className="text-lg font-display font-bold text-foreground mb-2">
              Preparation Time
            </h2>
            <div className="text-5xl font-display font-bold text-primary mb-4">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm text-muted-foreground font-body">
              Prepare your arguments for when it's your turn.
            </p>
          </motion.div>
        )}

        {role === "outgoing" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center">
              <Edit3 className="w-8 h-8 text-primary mx-auto mb-3" />
              <h2 className="text-lg font-display font-bold text-foreground mb-1">
                Review Your Summary
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Verify and edit the AI-generated summary of your statement.
              </p>
              {timeRemaining !== null && (
                <div className="text-2xl font-display font-bold text-primary mt-2">
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>

            {lastTranscript && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Your Transcript
                </p>
                <p className="text-sm text-foreground font-body leading-relaxed">
                  {lastTranscript}
                </p>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-4">
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
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
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
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default PrepPhaseOverlay;
