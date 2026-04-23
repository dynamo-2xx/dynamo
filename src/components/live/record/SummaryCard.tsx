import { ArrowRight } from "lucide-react";
import type { RoleGroupSummary } from "./types";

interface SummaryCardProps {
  summary: RoleGroupSummary;
  speakerName: string;
  onJumpToTranscript: (entryIds: string[]) => void;
  citation?: { text: string; url?: string | null };
}

/**
 * Per role-group argument summary line. Bullet glyph indicates role:
 *   • main / rebuttal     ↳ counter
 * Emits onJumpToTranscript when "View transcript" is clicked.
 */
const SummaryCard = ({ summary, speakerName, onJumpToTranscript, citation }: SummaryCardProps) => {
  const isCounter = summary.kind === "counter";
  const glyph = isCounter ? "↳" : "•";
  const roleLabel =
    summary.kind === "main" ? "Main" : summary.kind === "counter" ? "Counter" : "Rebuttal";

  return (
    <div
      data-summary-node-id={summary.node_id}
      className={`group relative ${isCounter ? "pl-6" : "pl-3"} py-2`}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-foreground/40 select-none text-sm leading-none">{glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            {roleLabel} <span className="text-foreground/40">— {speakerName}</span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed font-body">{summary.text}</p>
          <button
            type="button"
            onClick={() => onJumpToTranscript(summary.source_entry_ids)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            View transcript
            <ArrowRight className="w-3 h-3" />
          </button>

          {citation && (
            <div className="mt-2 pt-2 border-t border-foreground/10">
              <a
                href={citation.url || undefined}
                target={citation.url ? "_blank" : undefined}
                rel={citation.url ? "noopener noreferrer" : undefined}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors italic"
              >
                {citation.text}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;