import { useMemo } from "react";
import { Check, Loader2 } from "lucide-react";
import { useArgumentUnits } from "@/hooks/useArgumentUnits";

interface AnalysisProgressProps {
  sessionId: string | null | undefined;
  sessionKind: "debate" | "cmm" | "live" | "imported";
  /** Transcript entries from the record — used to detect "Live insights"
   *  completion via presence of any `ai_summary`. */
  transcriptEntries: Array<{ ai_summary?: string | null }>;
}

/**
 * Two-segment progress strip rendered above the hero on ended records.
 * - Live insights → green when any transcript entry carries `ai_summary`.
 * - Deep analysis → green when `argument_units` contains a `structure_final`
 *   row for this session (real-time subscription via useArgumentUnits).
 * Auto-hides when both segments are complete.
 */
export default function AnalysisProgress({
  sessionId,
  sessionKind,
  transcriptEntries,
}: AnalysisProgressProps) {
  const { units } = useArgumentUnits(sessionId ?? null, sessionKind);

  const liveDone = useMemo(
    () => transcriptEntries.some((e) => !!e.ai_summary),
    [transcriptEntries],
  );
  const deepDone = useMemo(
    () => units.some((u) => u.pass_kind === "structure_final"),
    [units],
  );

  if (liveDone && deepDone) return null;

  return (
    <div
      className="mb-4 rounded-xl border border-foreground/10 bg-background/60 backdrop-blur-sm px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
          Analyzing this record
        </p>
        <p className="text-[10px] text-muted-foreground font-body">
          Refreshes automatically
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Segment label="Live insights" done={liveDone} />
        <Segment label="Deep analysis" done={deepDone} />
      </div>
    </div>
  );
}

function Segment({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[11px] font-body text-foreground">
        {done ? (
          <Check className="w-3 h-3 text-foreground" />
        ) : (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
        <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      </div>
      <div className="h-1 rounded-full bg-foreground/10 overflow-hidden">
        {done ? (
          <div className="h-full w-full bg-foreground" />
        ) : (
          <div className="h-full w-1/3 bg-foreground/40 animate-pulse" />
        )}
      </div>
    </div>
  );
}