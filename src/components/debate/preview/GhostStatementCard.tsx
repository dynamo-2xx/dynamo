import { cn } from "@/lib/utils";

interface GhostStatementCardProps {
  kind: "main" | "counter" | "affirms";
  speakerLabel: string;
}

/**
 * Skeleton placeholder shaped like a SummaryCard. Used in the Explore preview
 * to show what a future statement will look like inside a subtopic.
 */
const GhostStatementCard = ({ kind, speakerLabel }: GhostStatementCardProps) => {
  const isResponse = kind !== "main";
  const glyph = isResponse ? "↳" : "•";
  const label = kind === "main" ? "Main" : kind === "counter" ? "Counter" : "Affirms";

  return (
    <div className={cn("relative py-2", isResponse ? "pl-6" : "pl-3")}>
      <div className="flex items-baseline gap-2">
        <span className="text-foreground/30 select-none text-sm leading-none">{glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
            {label} <span className="text-foreground/30">— {speakerLabel}</span>
          </div>
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 rounded-md bg-foreground/[0.06] w-[92%]" />
            <div className="h-3 rounded-md bg-foreground/[0.06] w-[78%]" />
            <div className="h-3 rounded-md bg-foreground/[0.06] w-[55%]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GhostStatementCard;