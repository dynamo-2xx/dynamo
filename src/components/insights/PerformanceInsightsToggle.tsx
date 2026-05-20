import { useMemo, useState } from "react";
import { Sparkles, Lock, Smile, Meh, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePerformanceAnnotations, type PerfAnnotation } from "@/hooks/usePerformanceAnnotations";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";

/**
 * §21 Performance Intelligence — Premium-only insights toggle.
 * Renders a chip; clicking opens a 3-marker legend (green/orange/red).
 * Free users see the chip but it routes to /pricing.
 */
export function PerformanceInsightsToggle({
  sessionId,
  sessionKind,
  participantId,
  onFilterChange,
}: {
  sessionId: string;
  sessionKind: "debate" | "cmm" | "live";
  participantId?: string;
  onFilterChange?: (severities: Array<PerfAnnotation["severity"]>) => void;
}) {
  const { tier } = useSubscription();
  const isPremium = tier !== "free";
  const { data } = usePerformanceAnnotations(isPremium ? sessionId : null, sessionKind, participantId);
  const [active, setActive] = useState<Set<PerfAnnotation["severity"]>>(new Set());

  const counts = useMemo(() => {
    const c = { green: 0, orange: 0, red: 0 } as Record<PerfAnnotation["severity"], number>;
    for (const a of data) c[a.severity]++;
    return c;
  }, [data]);

  function toggle(sev: PerfAnnotation["severity"]) {
    const next = new Set(active);
    next.has(sev) ? next.delete(sev) : next.add(sev);
    setActive(next);
    onFilterChange?.(Array.from(next));
  }

  if (!isPremium) {
    return (
      <Link to="/pricing">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          <Sparkles className="h-3.5 w-3.5" /> Insights
        </Button>
      </Link>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Insights
          {data.length > 0 && <span className="ml-1 text-xs tabular-nums text-muted-foreground">{data.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground px-2 py-1.5">Show insights</div>
        <Marker icon={<Smile className="h-4 w-4 text-emerald-600" />} label="Strong" count={counts.green} active={active.has("green")} onClick={() => toggle("green")} />
        <Marker icon={<Meh className="h-4 w-4 text-amber-600" />} label="Concern" count={counts.orange} active={active.has("orange")} onClick={() => toggle("orange")} />
        <Marker icon={<Frown className="h-4 w-4 text-red-600" />} label="Problem" count={counts.red} active={active.has("red")} onClick={() => toggle("red")} />
        <div className="border-t border-border my-1" />
        <Link
          to={`/intelligence/${sessionKind}/${sessionId}`}
          className="block px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Open full report →
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function Marker({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count: number; active: boolean; onClick: () => void }) {
  const disabled = count === 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${active ? "bg-accent" : "hover:bg-accent/50"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  );
}