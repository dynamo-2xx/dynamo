import { ReactNode, useEffect, useRef, useState, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
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
  /** Initial width (px). Defaults to 420. */
  initialWidth?: number;
  /** Initial height (px). Defaults to 420. */
  initialHeight?: number;
  /** Storage key used to remember the last drag position across opens. */
  storageKey?: string;
  /** Optional extra controls rendered on the right side of the header (e.g. tabs). */
  headerExtras?: ReactNode;
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
  initialWidth = 420,
  initialHeight = 420,
  storageKey,
  headerExtras,
}: FloatingOverlayProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; baseW: number; baseH: number } | null>(null);

  const [state, setState] = useState<{ x: number; y: number; w: number; h: number }>(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`floating-overlay:${storageKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            x: parsed.x ?? initialPosition?.x ?? 16,
            y: parsed.y ?? initialPosition?.y ?? 16,
            w: parsed.w ?? initialWidth,
            h: parsed.h ?? initialHeight,
          };
        }
      } catch { /* ignore */ }
    }
    return {
      x: initialPosition?.x ?? 16,
      y: initialPosition?.y ?? 16,
      w: initialWidth,
      h: initialHeight,
    };
  });

  // Persist position + size
  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(`floating-overlay:${storageKey}`, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state, storageKey]);

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
      baseX: state.x,
      baseY: state.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const panel = panelRef.current;
    let nextX = dragState.current.baseX + dx;
    let nextY = dragState.current.baseY + dy;
    if (panel) {
      // Clamp to the viewport — the overlay is portaled to <body> and uses
      // position: fixed, so it can be dragged anywhere on screen (over the
      // sidebar, transcript pane, etc.), not just inside the main panel.
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      nextX = Math.max(0, Math.min(maxX, nextX));
      nextY = Math.max(0, Math.min(maxY, nextY));
    }
    setState((s) => ({ ...s, x: nextX, y: nextY }));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const onResizeDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseW: state.w,
      baseH: state.h,
    };
  };
  const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return;
    const dw = e.clientX - resizeState.current.startX;
    const dh = e.clientY - resizeState.current.startY;
    let nextW = Math.max(280, resizeState.current.baseW + dw);
    let nextH = Math.max(220, resizeState.current.baseH + dh);
    nextW = Math.min(window.innerWidth - state.x - 8, nextW);
    nextH = Math.min(window.innerHeight - state.y - 8, nextH);
    setState((s) => ({ ...s, w: nextW, h: nextH }));
  };
  const onResizeUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    resizeState.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const content = (
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
            className="fixed inset-0 z-[60]"
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ left: state.x, top: state.y, width: state.w, height: state.h, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100vh - 16px)" }}
            className="fixed z-[70] flex flex-col rounded-2xl border border-foreground/10 bg-background/85 backdrop-blur-xl shadow-2xl overflow-hidden"
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
              <div className="flex items-center gap-1 shrink-0" data-no-drag>
                {headerExtras}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-foreground/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {children}
            </div>
            <div
              onPointerDown={onResizeDown}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeUp}
              onPointerCancel={onResizeUp}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
              aria-label="Resize"
              title="Drag to resize"
              style={{
                background: "linear-gradient(135deg, transparent 50%, hsl(var(--foreground) / 0.25) 50%)",
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
};

export default FloatingOverlay;
