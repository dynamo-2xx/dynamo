import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Edit3, Check, ArrowRight, Loader2 } from "lucide-react";
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
  prepTimeMin: number;
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
  allTranscriptEntries = [],
  subtopics = [],
  sides = [],
  isSummaryBeingEdited,
  notebookValue,
  onNotebookChange,
}: PrepPhaseOverlayProps) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [editedSummary, setEditedSummary] = useState(lastAiSummary || "");
  const [summarySubmitted, setSummarySubmitted] = useState(false);
  const [markedReady, setMarkedReady] = useState(false);
  const [localNotes, setLocalNotes] = useState("");

  const notesValue = notebookValue !== undefined ? notebookValue : localNotes;
  const setNotesValue = onNotebookChange || setLocalNotes;
  const syncedDuration = selectedPrepDuration || selectedTime;
  const hasPrepTimerStarted = Boolean(prepStartedAt && syncedDuration);

  const availableOptions = PREP_OPTIONS.filter(t => t >= prepTimeMin && t <= prepTimeMax);

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

  const handleSelectTime = (seconds: number) => {
    setSelectedTime(seconds);
    onPrepTimeSelected?.(seconds);
  };

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

  // Group transcript entries by subtopic
  const entriesBySubtopic = subtopics.map(st => ({
    subtopic: st,
    entries: allTranscriptEntries.filter(e => e.is_final && e.subtopic === st.title),
  })).filter(g => g.entries.length > 0);

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
        {/* INCOMING: Time selection */}
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
                  ? "Review the debate and prepare your arguments."
                  : "Waiting for the other side to choose the prep time."}
              </p>
            </div>

            {/* 3-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Transcripts */}
              <div className="bg-card border border-border rounded-xl p-4 max-h-[55vh] overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Transcripts
                </p>
                {entriesBySubtopic.length > 0 ? (
                  <div className="space-y-3">
                    {entriesBySubtopic.map(({ subtopic, entries }) => (
                      <div key={subtopic.id}>
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">
                          {subtopic.title}
                        </p>
                        <div className="space-y-1.5">
                          {entries.map((entry) => (
                            <div key={entry.id} className="text-xs font-body">
                              <span className="font-semibold text-foreground">{entry.speaker_side}:</span>{" "}
                              <span className="text-muted-foreground">{entry.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic font-body">No transcripts yet.</p>
                )}
              </div>

              {/* Column 2: Summaries */}
              <div className="bg-card border border-border rounded-xl p-4 max-h-[55vh] overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Summaries
                </p>
                {entriesBySubtopic.length > 0 ? (
                  <div className="space-y-3">
                    {entriesBySubtopic.map(({ subtopic, entries }, groupIdx) => {
                      const summaries = entries.filter(e => e.ai_summary);
                      const isLastGroup = groupIdx === entriesBySubtopic.length - 1;
                      return (
                        <div key={subtopic.id}>
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">
                            {subtopic.title}
                          </p>
                          {summaries.length > 0 ? (
                            <div className="space-y-1.5">
                              {summaries.map((entry) => (
                                <div key={entry.id} className="text-xs font-body">
                                  <span className="font-semibold text-foreground">{entry.speaker_side}:</span>{" "}
                                  <span className="text-muted-foreground">{entry.ai_summary}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {isLastGroup && isSummaryBeingEdited && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Loader2 className="w-3 h-3 text-primary animate-spin" />
                              <span className="text-[10px] text-primary font-semibold animate-pulse">
                                Editing…
                              </span>
                            </div>
                          )}
                          {summaries.length === 0 && !(isLastGroup && isSummaryBeingEdited) && (
                            <p className="text-[10px] text-muted-foreground italic">No summaries yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic font-body">No summaries yet.</p>
                )}
              </div>

              {/* Column 3: My Notes */}
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
