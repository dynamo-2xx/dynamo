import { ReactNode, useEffect, useRef, useState, PointerEvent as ReactPointerEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripHorizontal, X } from "lucide-react";

interface FloatingOverlayProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  /** Initial offset from the top-left of the parent (px). Defaults to 16/16. */
  initialPosition?: { x: number; y: number };
  /** Width of the overlay (responsive). Defaults to 420 max. */
  widthClass?: string;
  /** Storage key used to remember the last drag position across opens. */
  storageKey?: string;
}

/**
 * Translucent floating panel anchored to the closest `relative` parent.
 * Drag by the header to reposition. Closes on backdrop click, × button, or Escape.
 */
const FloatingOverlay = ({
  open,
  onClose,
  eyebrow,
  title,
  children,
  initialPosition,
  widthClass = "w-[min(420px,calc(100%-2rem))]",
  storageKey,
}: FloatingOverlayProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`floating-overlay:${storageKey}`);
        if (raw) return JSON.parse(raw);
      } catch { /* ignore */ }
    }
    return initialPosition ?? { x: 16, y: 16 };
  });

  // Persist position
  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(`floating-overlay:${storageKey}`, JSON.stringify(pos));
    } catch { /* ignore */ }
  }, [pos, storageKey]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only left button / primary pointer
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start drag when clicking the close button
    if (target.closest("[data-no-drag]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const parent = panelRef.current?.offsetParent as HTMLElement | null;
    const panel = panelRef.current;
    let nextX = dragState.current.baseX + dx;
    let nextY = dragState.current.baseY + dy;
    if (parent && panel) {
      const maxX = parent.clientWidth - panel.offsetWidth;
      const maxY = parent.clientHeight - panel.offsetHeight;
      nextX = Math.max(0, Math.min(maxX, nextX));
      nextY = Math.max(0, Math.min(maxY, nextY));
    }
    setPos({ x: nextX, y: nextY });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-outside backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 z-30"
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ left: pos.x, top: pos.y }}
            className={`absolute z-40 ${widthClass} max-h-[70vh] flex flex-col rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur-xl shadow-2xl overflow-hidden`}
          >
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  {eyebrow && (
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                      {eyebrow}
                    </p>
                  )}
                  <h3 className="text-sm font-display font-semibold text-foreground truncate">
                    {title}
                  </h3>
                </div>
              </div>
              <button
                data-no-drag
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-foreground/10 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FloatingOverlay;
