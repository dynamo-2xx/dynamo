import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface TranscriptCardProps {
  speakerSide: string;
  sideOrder: number;
  text: string;
  aiSummary?: string;
  timestamp?: number;
  compact?: boolean;
  autoFlip?: boolean;
  entryId?: string;
  argumentId?: string;
}

const TranscriptCard = ({ speakerSide, sideOrder, text, aiSummary, timestamp, compact = false, autoFlip = false, entryId, argumentId }: TranscriptCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const [autoFlipped, setAutoFlipped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [needsSummaryClamp, setNeedsSummaryClamp] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight) || 16;
      setNeedsClamp(textRef.current.scrollHeight > lineHeight * 4.2);
    }
  }, [text]);

  useEffect(() => {
    if (summaryRef.current && aiSummary) {
      const lineHeight = parseFloat(getComputedStyle(summaryRef.current).lineHeight) || 16;
      setNeedsSummaryClamp(summaryRef.current.scrollHeight > lineHeight * 4.2);
    }
  }, [aiSummary, flipped]);

  // Auto-flip to AI summary when it becomes available
  useEffect(() => {
    if (autoFlip && aiSummary && !autoFlipped) {
      setFlipped(true);
      setAutoFlipped(true);
    }
  }, [aiSummary, autoFlip, autoFlipped]);

  const handleDoubleClick = () => {
    if (aiSummary) {
      setFlipped((f) => {
        if (!f) {
          // Flipping to summary — reset summary expand
          setSummaryExpanded(false);
        } else {
          // Flipping to transcript — reset transcript expand
          setExpanded(false);
        }
        return !f;
      });
    }
  };

  const sideColor = sideOrder === 0 ? "hsl(var(--side-1))" : "hsl(var(--side-2))";
  const sideBg = sideOrder === 0 ? "hsl(var(--side-1) / 0.08)" : "hsl(var(--side-2) / 0.08)";

  const isRight = sideOrder !== 0;

  const cardClasses = `rounded-lg px-3 py-2 ${compact ? "text-[11px]" : "text-xs"} ${isRight ? "border-r-[3px]" : "border-l-[3px]"}`;
  const borderStyle = isRight ? { borderRightColor: sideColor } : { borderLeftColor: sideColor };

  return (
    <div
      className={`cursor-default select-text flex ${isRight ? "justify-end" : "justify-start"}`}
      onDoubleClick={handleDoubleClick}
      style={{ perspective: "800px" }}
      data-entry-id={entryId}
      data-argument-id={argumentId}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative", width: "85%" }}
      >
        {/* Front: transcript — in normal flow, hidden via backface when flipped */}
        <div
          className={cardClasses}
          style={{
            ...borderStyle,
            backgroundColor: sideBg,
            backfaceVisibility: "hidden",
            visibility: flipped ? "hidden" : "visible",
            height: flipped ? 0 : "auto",
            overflow: flipped ? "hidden" : "visible",
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="font-semibold text-[9px] uppercase tracking-wider"
              style={{ color: sideColor, fontFamily: "'DM Sans', sans-serif" }}
            >
              {speakerSide}
            </span>
            {timestamp && (
              <span className="text-[8px] text-muted-foreground font-mono">
                {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {aiSummary && (
              <span className="text-[8px] text-muted-foreground ml-auto italic">double-click for summary</span>
            )}
          </div>
          <p
            ref={textRef}
            className={`text-foreground leading-relaxed break-words whitespace-pre-wrap ${
              !expanded && needsClamp ? "line-clamp-4" : ""
            }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {text}
          </p>
          {needsClamp && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-[10px] text-primary font-medium mt-0.5 hover:underline"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {expanded ? "See less" : "See more"}
            </button>
          )}
        </div>

        {/* Back: AI summary — in normal flow when flipped, hidden otherwise */}
        {aiSummary && (
          <div
            className={cardClasses}
            style={{
              ...borderStyle,
              backgroundColor: sideBg,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              position: flipped ? "relative" : "absolute",
              top: flipped ? undefined : 0,
              left: flipped ? undefined : 0,
              right: flipped ? undefined : 0,
              visibility: flipped ? "visible" : "hidden",
              height: flipped ? "auto" : 0,
              overflow: flipped ? "visible" : "hidden",
            }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="font-semibold text-[9px] uppercase tracking-wider"
                style={{ color: sideColor, fontFamily: "'DM Sans', sans-serif" }}
              >
                {speakerSide} — AI Summary
              </span>
              <span className="text-[8px] text-muted-foreground ml-auto italic">double-click for transcript</span>
            </div>
            <p
              ref={summaryRef}
              className={`text-foreground leading-relaxed break-words whitespace-pre-wrap italic ${
                !summaryExpanded && needsSummaryClamp ? "line-clamp-4" : ""
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {aiSummary}
            </p>
            {needsSummaryClamp && (
              <button
                onClick={(e) => { e.stopPropagation(); setSummaryExpanded(!summaryExpanded); }}
                className="text-[10px] text-primary font-medium mt-0.5 hover:underline"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {summaryExpanded ? "See less" : "See more"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TranscriptCard;
