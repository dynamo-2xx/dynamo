import { useEffect, useRef, useState, type ReactNode } from "react";
import { Globe, Lock, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SwipeState = "neutral" | "left" | "right";

interface Props {
  children: ReactNode;
  /** Whether owner-only actions can be performed on this card. If false, swipe is disabled. */
  enabled: boolean;
  isPublic?: boolean;
  busy?: boolean;
  onTogglePrivacy?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  /** Called when this card opens — parent can close any other open card. */
  onOpen?: () => void;
  /** Force-close from parent. */
  forceClose?: number;
}

const REVEAL_PX = 168;
const TRIGGER_PX = 56;

const SwipeableDebateCard = ({
  children,
  enabled,
  isPublic,
  busy,
  onTogglePrivacy,
  onArchive,
  onDelete,
  onOpen,
  forceClose,
}: Props) => {
  const [state, setState] = useState<SwipeState>("neutral");
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);
  const horizontalLock = useRef<boolean | null>(null);

  // Allow parent to close this card
  useEffect(() => {
    setState("neutral");
    setDragX(0);
  }, [forceClose]);

  // Touch handlers — mobile only
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    dragging.current = true;
    horizontalLock.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || startX.current == null || startY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (horizontalLock.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        horizontalLock.current = Math.abs(dx) > Math.abs(dy);
      }
    }
    if (!horizontalLock.current) return;
    // Start from current latched offset
    const base = state === "left" ? -REVEAL_PX : state === "right" ? REVEAL_PX : 0;
    const next = base + dx;
    // clamp
    setDragX(Math.max(-REVEAL_PX * 1.2, Math.min(REVEAL_PX * 1.2, next)));
  };

  const handleTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (horizontalLock.current !== true) {
      // Vertical scroll, ignore
      return;
    }
    // Latch based on dragX direction & threshold
    if (dragX <= -TRIGGER_PX) {
      setState("left");
      setDragX(-REVEAL_PX);
      onOpen?.();
    } else if (dragX >= TRIGGER_PX) {
      setState("right");
      setDragX(REVEAL_PX);
      onOpen?.();
    } else {
      setState("neutral");
      setDragX(0);
    }
  };

  const close = () => {
    setState("neutral");
    setDragX(0);
  };

  // Tap-to-close when latched (intercept clicks on the card content)
  const handleContentClick = (e: React.MouseEvent) => {
    if (state !== "neutral") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const offset = state === "neutral" && !dragging.current ? 0 : dragX;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Right-side panel (revealed when swiping LEFT) — Archive + Delete */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={() => {
            close();
            onArchive?.();
          }}
          disabled={busy}
          aria-label="Archive"
          className="flex flex-col items-center justify-center gap-1 w-[84px] bg-amber-500 text-white text-xs font-body font-medium disabled:opacity-60"
        >
          <Archive className="w-5 h-5" />
          Archive
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            onDelete?.();
          }}
          disabled={busy}
          aria-label="Delete"
          className="flex flex-col items-center justify-center gap-1 w-[84px] bg-destructive text-destructive-foreground text-xs font-body font-medium disabled:opacity-60"
        >
          <Trash2 className="w-5 h-5" />
          Delete
        </button>
      </div>

      {/* Left-side panel (revealed when swiping RIGHT) — Privacy toggle */}
      <div className="absolute inset-y-0 left-0 flex items-stretch">
        <button
          type="button"
          onClick={() => {
            close();
            onTogglePrivacy?.();
          }}
          disabled={busy}
          aria-label={isPublic ? "Make private" : "Make public"}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-[168px] text-xs font-body font-medium disabled:opacity-60",
            isPublic ? "bg-foreground text-background" : "bg-emerald-600 text-white",
          )}
        >
          {isPublic ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
          {isPublic ? "Make Private" : "Make Public"}
        </button>
      </div>

      {/* Swiping content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleContentClick}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? "none" : "transform 200ms ease-out",
          touchAction: horizontalLock.current ? "pan-y" : "auto",
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableDebateCard;
