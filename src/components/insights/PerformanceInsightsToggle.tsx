import { Sparkles, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useInsights } from "@/contexts/InsightsContext";

/**
 * §21 Insights — toggle + polarity chips for the Argument Map overlay header.
 * Reads its state from InsightsContext (provided once per session).
 *
 * Behavior:
 *  - Free users: shows a locked chip linking to /pricing.
 *  - Premium: toggle on/off. When on, two polarity chips (positive/negative)
 *    appear next to it with counts; click to filter.
 */
export function PerformanceInsightsToggle() {
  const ctx = useInsights();

  if (!ctx) return null;

  if (!ctx.isPremium) {
    return (
      <Link
        to="/pricing"
        title="Upgrade to unlock Insights"
        className="inline-flex items-center gap-1 rounded-full border border-foreground/10 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
      >
        <Lock className="w-3 h-3" /> Insights
      </Link>
    );
  }

  const total = ctx.counts.positive + ctx.counts.negative;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => ctx.setEnabled(!ctx.enabled)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
          ctx.enabled
            ? "border-foreground/30 bg-foreground/[0.06] text-foreground"
            : "border-foreground/10 text-muted-foreground hover:text-foreground"
        }`}
        title={ctx.enabled ? "Hide insights" : "Show insights"}
      >
        <Sparkles className="w-3 h-3" />
        Insights
        {total > 0 && <span className="tabular-nums opacity-70">{total}</span>}
      </button>
      {ctx.enabled && (
        <>
          <PolarityChip
            polarity="positive"
            count={ctx.counts.positive}
            active={ctx.activeFilters.has("positive")}
            onClick={() => ctx.toggleFilter("positive")}
          />
          <PolarityChip
            polarity="negative"
            count={ctx.counts.negative}
            active={ctx.activeFilters.has("negative")}
            onClick={() => ctx.toggleFilter("negative")}
          />
        </>
      )}
    </div>
  );
}

function PolarityChip({
  polarity,
  count,
  active,
  onClick,
}: {
  polarity: "positive" | "negative";
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const isPositive = polarity === "positive";
  const baseColor = isPositive ? "emerald" : "red";
  const disabled = count === 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={`${isPositive ? "Strengths" : "Issues"} — ${count}`}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums transition-colors ${
        active
          ? isPositive
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
          : "border-foreground/10 text-muted-foreground hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-${baseColor}-500`} />
      {count}
    </button>
  );
}