import { Zap } from "lucide-react";

interface KeyArgument {
  side: string;
  content: string;
  type: string;
  significance: string;
}

interface RoundSummaryCardProps {
  summary: string;
  keyArguments: KeyArgument[];
  subtopicTitle: string;
  compact?: boolean;
}

const RoundSummaryCard = ({ summary, keyArguments, subtopicTitle, compact }: RoundSummaryCardProps) => {
  return (
    <div className="border border-primary/20 bg-primary/5 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Zap className="w-3 h-3 text-primary" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Round Summary
        </span>
      </div>
      <div className={compact ? "px-3 py-2" : "px-4 py-3"}>
        <p className={`text-foreground font-body leading-relaxed ${compact ? "text-[11px]" : "text-xs"}`}>
          {summary}
        </p>
        {keyArguments.length > 0 && !compact && (
          <div className="mt-3 space-y-1.5">
            {keyArguments.map((arg, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] font-body">
                <span className="text-primary font-semibold shrink-0">[{arg.side}]</span>
                <span className="text-muted-foreground">{arg.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoundSummaryCard;
