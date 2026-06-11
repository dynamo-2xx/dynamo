import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HARD_CAP_MS = 60 * 60 * 1000; // 60:00
const BUBBLE_DURATION_MS = 5000;
// Thresholds (ms remaining) at which the icon morphs into a time-left bubble.
const PULSE_THRESHOLDS_MS = [30 * 60 * 1000, 5 * 60 * 1000];

function formatRemaining(ms: number) {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SessionClockButtonProps {
  /** ISO timestamp the session started (we use live_sessions.created_at). */
  startedAt: string | null | undefined;
  /** ISO timestamp the current pause window began (null when running). */
  pausedAt?: string | null;
  /** Total ms accumulated across prior, already-resolved pause windows. */
  accumulatedPausedMs?: number;
  /** Show owner-only "End early" affordance in the popover. */
  isOwner?: boolean;
  /** Called once when the cap is reached. */
  onTimeUp?: () => void;
  /** Owner-only: invoked when the user taps "End early". */
  onEndEarly?: () => void;
}

/**
 * Minimal clock icon that morphs into a "XX:XX left" bubble at 30min and
 * 5min remaining for 5s each, then reverts. Tap to see exact remaining time.
 * Auto-triggers onTimeUp at 60:00 elapsed.
 */
export default function SessionClockButton({
  startedAt,
  pausedAt = null,
  accumulatedPausedMs = 0,
  isOwner = false,
  onTimeUp,
  onEndEarly,
}: SessionClockButtonProps) {
  const paused = !!pausedAt;
  // Drive re-renders so wall-clock derived elapsed updates while running.
  const [, setNowTick] = useState(0);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const firedThresholds = useRef<Set<number>>(new Set());
  const firedTimeUp = useRef(false);

  // Tick every second only when running. While paused, elapsed is frozen by
  // pausedAt so we don't need to re-render.
  useEffect(() => {
    if (paused) return;
    const i = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [paused]);

  const elapsedMs = (() => {
    if (!startedAt) return 0;
    const startMs = new Date(startedAt).getTime();
    if (!Number.isFinite(startMs)) return 0;
    // While paused, freeze elapsed at the moment the current pause began.
    const refNow = paused ? new Date(pausedAt!).getTime() : Date.now();
    return Math.max(0, refNow - startMs - (accumulatedPausedMs || 0));
  })();
  const remainingMs = Math.max(0, HARD_CAP_MS - elapsedMs);

  // Threshold pulses + time-up.
  useEffect(() => {
    for (const t of PULSE_THRESHOLDS_MS) {
      if (remainingMs <= t && !firedThresholds.current.has(t)) {
        firedThresholds.current.add(t);
        setBubbleText(`${formatRemaining(t)} left`);
        const timer = setTimeout(() => setBubbleText(null), BUBBLE_DURATION_MS);
        return () => clearTimeout(timer);
      }
    }
    if (remainingMs <= 0 && !firedTimeUp.current) {
      firedTimeUp.current = true;
      onTimeUp?.();
    }
  }, [remainingMs, onTimeUp]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Session time. ${formatRemaining(remainingMs)} remaining of 1 hour limit.`}
          className="relative inline-flex items-center justify-center min-h-[36px] min-w-[36px] px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <AnimatePresence mode="wait" initial={false}>
            {bubbleText ? (
              <motion.span
                key="bubble"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-body font-semibold text-foreground border border-foreground/15 bg-background/80 backdrop-blur-sm shadow-sm"
              >
                <Clock className="w-3 h-3" />
                {bubbleText}
              </motion.span>
            ) : (
              <motion.span
                key="icon"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="inline-flex"
              >
                <Clock className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-semibold">
            Session time
          </div>
          <div className="font-display text-2xl text-foreground tabular-nums">
            {formatRemaining(remainingMs)}
          </div>
          <div className="text-[11px] text-muted-foreground font-body">
            remaining — session auto-ends at 1:00:00.
          </div>
          {isOwner && onEndEarly && (
            <button
              type="button"
              onClick={onEndEarly}
              className="mt-1 text-[11px] font-body font-semibold text-foreground hover:underline"
            >
              End early
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}