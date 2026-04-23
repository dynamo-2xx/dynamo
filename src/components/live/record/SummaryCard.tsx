import { ArrowRight } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { RoleGroupSummary } from "./types";
import type { LiveTranscriptEntry } from "@/hooks/useLiveTranscription";
import type { SessionCitation } from "@/hooks/useSessionCitations";
import type { SessionCrossRef } from "@/hooks/useSessionCrossRefs";
import HoverPreviewBubble from "./HoverPreviewBubble";
import FootnoteMarker from "./FootnoteMarker";
import CitationEditor from "./CitationEditor";

interface SummaryCardProps {
  summary: RoleGroupSummary;
  speakerName: string;
  sourceEntries: LiveTranscriptEntry[];
  onJumpToTranscript: (entryIds: string[]) => void;
  citation?: SessionCitation | null;
  isHost?: boolean;
  onSaveCitation?: (text: string, url: string) => void;
  onDeleteCitation?: () => void;
  crossRefs?: SessionCrossRef[];
  numberByRefId?: Map<string, number>;
  onJumpToCrossRef?: (toNodeId: string) => void;
}

/**
 * Per role-group argument summary line. Bullet glyph indicates role:
 *   • main / rebuttal     ↳ counter
 * Emits onJumpToTranscript when "View transcript" is clicked.
 */
const SummaryCard = ({
  summary,
  speakerName,
  sourceEntries,
  onJumpToTranscript,
  citation,
  isHost,
  onSaveCitation,
  onDeleteCitation,
  crossRefs = [],
  numberByRefId,
  onJumpToCrossRef,
}: SummaryCardProps) => {
  const isCounter = summary.kind === "counter";
  const glyph = isCounter ? "↳" : "•";
  const roleLabel =
    summary.kind === "main" ? "Main" : summary.kind === "counter" ? "Counter" : "Rebuttal";

  const firstEntry = sourceEntries[0];
  const excerpt =
    sourceEntries.map((e) => e.text).join(" ").slice(0, 280) ||
    summary.text;
  const ts = firstEntry?.timestamp
    ? new Date(firstEntry.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

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
          <HoverCard openDelay={250} closeDelay={100}>
            <HoverCardTrigger asChild>
              <p className="text-sm text-foreground/90 leading-relaxed font-body cursor-help">
                {summary.text}
                {numberByRefId && crossRefs.length > 0 && onJumpToCrossRef && (
                  <FootnoteMarker
                    refs={crossRefs}
                    numberByRefId={numberByRefId}
                    onJump={onJumpToCrossRef}
                  />
                )}
              </p>
            </HoverCardTrigger>
            <HoverCardContent
              side="right"
              align="start"
              className="p-0 border-0 bg-transparent shadow-none w-auto"
              data-preview-bubble
            >
              <HoverPreviewBubble
                excerpt={excerpt}
                speaker={speakerName}
                timestamp={ts}
                citation={citation ? { text: citation.text, url: citation.url } : null}
                onJumpToTranscript={() => onJumpToTranscript(summary.source_entry_ids)}
              />
            </HoverCardContent>
          </HoverCard>
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

          {isHost && onSaveCitation && onDeleteCitation && (
            <CitationEditor
              summaryNodeId={summary.node_id}
              citation={citation || null}
              onSave={onSaveCitation}
              onDelete={onDeleteCitation}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;