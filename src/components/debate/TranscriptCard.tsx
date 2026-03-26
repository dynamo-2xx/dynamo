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
}

const TranscriptCard = ({ speakerSide, sideOrder, text, aiSummary, timestamp, compact = false, autoFlip = false }: TranscriptCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const [autoFlipped, setAutoFlipped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [needsSummaryClamp, setNeedsSummaryClamp] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [cardMinHeight, setCardMinHeight] = useState<number>();

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight) || 16;
      setNeedsClamp(textRef.current.scrollHeight > lineHeight * 4.2);
    }
  }, [text]);

  // Measure summary clamp
  useEffect(() => {
    if (summaryRef.current && aiSummary) {
      const lineHeight = parseFloat(getComputedStyle(summaryRef.current).lineHeight) || 16;
      setNeedsSummaryClamp(summaryRef.current.scrollHeight > lineHeight * 4.2);
    }
  }, [aiSummary, flipped]);

  useEffect(() => {
    const frontHeight = frontRef.current?.offsetHeight ?? 0;
    const backHeight = backRef.current?.offsetHeight ?? 0;
    const nextHeight = Math.max(frontHeight, backHeight);
    if (nextHeight > 0) setCardMinHeight(nextHeight);
  }, [aiSummary, expanded, summaryExpanded, compact, flipped, needsClamp, needsSummaryClamp]);

  // Auto-flip to AI summary when it becomes available
  useEffect(() => {
    if (autoFlip && aiSummary && !autoFlipped) {
      setFlipped(true);
      setAutoFlipped(true);
    }
  }, [aiSummary, autoFlip, autoFlipped]);

  const handleDoubleClick = () => {
    if (aiSummary) setFlipped((f) => !f);
  };

  const sideColor = sideOrder === 0 ? "hsl(var(--side-1))" : "hsl(var(--side-2))";
  const sideBg = sideOrder === 0 ? "hsl(var(--side-1) / 0.08)" : "hsl(var(--side-2) / 0.08)";

  const isRight = sideOrder !== 0;

  return (
    <div
      className={`cursor-default select-text flex ${isRight ? "justify-end" : "justify-start"}`}
      onDoubleClick={handleDoubleClick}
      style={{ perspective: "800px", minHeight: cardMinHeight }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative", minHeight: cardMinHeight, width: "85%" }}
      >
        {/* Front: transcript */}
        <div
          ref={frontRef}
          className={`rounded-lg px-3 py-2 ${compact ? "text-[11px]" : "text-xs"} ${isRight ? "border-r-[3px]" : "border-l-[3px]"}`}
          style={{
            ...(isRight ? { borderRightColor: sideColor } : { borderLeftColor: sideColor }),
            backgroundColor: sideBg,
            backfaceVisibility: "hidden",
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

        {/* Back: AI summary */}
        {aiSummary && (
          <div
            ref={backRef}
            className={`rounded-lg px-3 py-2 absolute inset-0 overflow-auto ${compact ? "text-[11px]" : "text-xs"} ${isRight ? "border-r-[3px]" : "border-l-[3px]"}`}
            style={{
              ...(isRight ? { borderRightColor: sideColor } : { borderLeftColor: sideColor }),
              backgroundColor: sideBg,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
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
