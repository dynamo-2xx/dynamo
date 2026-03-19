import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface TranscriptCardProps {
  speakerSide: string;
  sideOrder: number;
  text: string;
  aiSummary?: string;
  timestamp?: number;
  compact?: boolean;
}

const TranscriptCard = ({ speakerSide, sideOrder, text, aiSummary, timestamp, compact = false }: TranscriptCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight) || 16;
      setNeedsClamp(textRef.current.scrollHeight > lineHeight * 4.2);
    }
  }, [text]);

  const handleDoubleClick = () => {
    if (aiSummary) setFlipped((f) => !f);
  };

  const sideColor = sideOrder === 0 ? "hsl(var(--side-1))" : "hsl(var(--side-2))";
  const sideBg = sideOrder === 0 ? "hsl(var(--side-1) / 0.08)" : "hsl(var(--side-2) / 0.08)";

  return (
    <div
      className="perspective-[800px] cursor-default select-text"
      onDoubleClick={handleDoubleClick}
      style={{ perspective: "800px" }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative" }}
      >
        {/* Front: transcript */}
        <div
          className={`rounded-lg border-l-[3px] px-3 py-2 ${compact ? "text-[11px]" : "text-xs"}`}
          style={{
            borderLeftColor: sideColor,
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
            className={`rounded-lg border-l-[3px] px-3 py-2 absolute inset-0 ${compact ? "text-[11px]" : "text-xs"}`}
            style={{
              borderLeftColor: sideColor,
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
              className="text-foreground leading-relaxed break-words whitespace-pre-wrap italic"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {aiSummary}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TranscriptCard;
