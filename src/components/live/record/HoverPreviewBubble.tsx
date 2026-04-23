import { ReactNode } from "react";

interface HoverPreviewBubbleProps {
  excerpt: string;
  speaker?: string;
  timestamp?: string;
  citation?: { text: string; url?: string | null } | null;
  onJumpToTranscript?: () => void;
  children?: ReactNode;
}

/**
 * Translucent two-half bubble shown on hover/long-press of a SummaryCard.
 * Top half: verbatim transcript excerpt. Optional bottom half: citation.
 * No text selection allowed inside (preview only).
 */
const HoverPreviewBubble = ({
  excerpt,
  speaker,
  timestamp,
  citation,
  onJumpToTranscript,
}: HoverPreviewBubbleProps) => {
  return (
    <div
      className="select-none w-[min(360px,90vw)] rounded-lg border border-foreground/10 bg-background/85 backdrop-blur-md shadow-lg overflow-hidden"
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={onJumpToTranscript}
        className="w-full text-left p-3 hover:bg-foreground/[0.03] transition-colors"
      >
        {(speaker || timestamp) && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex gap-2">
            {timestamp && <span>{timestamp}</span>}
            {speaker && <span className="text-foreground/60">{speaker}</span>}
          </div>
        )}
        <p className="text-xs text-foreground/85 leading-snug font-body line-clamp-6">
          “{excerpt}”
        </p>
      </button>
      {citation && (
        <>
          <div className="h-px bg-foreground/10" />
          <a
            href={citation.url || undefined}
            target={citation.url ? "_blank" : undefined}
            rel={citation.url ? "noopener noreferrer" : undefined}
            className="block p-3 text-[11px] text-muted-foreground italic hover:text-foreground hover:bg-foreground/[0.03] transition-colors"
          >
            {citation.text}
          </a>
        </>
      )}
    </div>
  );
};

export default HoverPreviewBubble;