import { useEffect, useState } from "react";

interface EmptyStateHintProps {
  active: boolean;
  baseText: string;
  hintMessages: string[]; // 1 = static, 2+ = rotates every 5s while active
  rotateMs?: number;
}

/**
 * Renders the base muted text by default, fading to the hint while active.
 * If multiple hint messages are provided, rotates them every `rotateMs` (default 5000).
 */
const EmptyStateHint = ({
  active,
  baseText,
  hintMessages,
  rotateMs = 5000,
}: EmptyStateHintProps) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active || hintMessages.length < 2) return;
    setIdx(0);
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % hintMessages.length);
    }, rotateMs);
    return () => window.clearInterval(t);
  }, [active, hintMessages.length, rotateMs]);

  const hint = hintMessages[idx] ?? hintMessages[0] ?? "";

  return (
    <span className="relative inline-block">
      <span
        className={`transition-opacity duration-300 ${active ? "opacity-0" : "opacity-100"}`}
      >
        {baseText}
      </span>
      <span
        aria-hidden={!active}
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
      >
        {hint}
      </span>
    </span>
  );
};

export default EmptyStateHint;
