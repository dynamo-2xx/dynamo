import { useEffect, useRef, useState, PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, GripHorizontal, Loader2 } from "lucide-react";
import { useFloatingDM } from "@/contexts/FloatingDMContext";
import { useThreads } from "@/hooks/useDirectMessages";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThreadView from "./ThreadView";

const WIDTH = 360;
const HEIGHT = 500;

/** Instagram-style draggable DM window, mounted once globally. */
const FloatingDMWindow = () => {
  const { threadId, close } = useFloatingDM();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { threads } = useThreads();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Default position: bottom-right with margin
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!threadId || isMobile) return;
    if (pos) return;
    const x = Math.max(16, window.innerWidth - WIDTH - 24);
    const y = Math.max(16, window.innerHeight - HEIGHT - 24);
    setPos({ x, y });
  }, [threadId, isMobile, pos]);

  // Clamp on resize
  useEffect(() => {
    if (!pos || isMobile) return;
    const onResize = () => {
      setPos((p) => {
        if (!p) return p;
        return {
          x: Math.max(0, Math.min(window.innerWidth - WIDTH, p.x)),
          y: Math.max(0, Math.min(window.innerHeight - HEIGHT, p.y)),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos, isMobile]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile || e.button !== 0 || !pos) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    let nx = dragState.current.baseX + dx;
    let ny = dragState.current.baseY + dy;
    nx = Math.max(0, Math.min(window.innerWidth - WIDTH, nx));
    ny = Math.max(0, Math.min(window.innerHeight - HEIGHT, ny));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const thread = threads.find((t) => t.id === threadId);
  const otherName = thread?.other_display_name || "Conversation";
  const otherAvatar = thread?.other_avatar_url ?? undefined;

  const expand = () => {
    if (!threadId) return;
    navigate(`/messages/${threadId}`);
    close();
  };

  return (
    <AnimatePresence>
      {threadId && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={
            isMobile
              ? undefined
              : pos
                ? { left: pos.x, top: pos.y, width: WIDTH, height: HEIGHT }
                : { right: 24, bottom: 24, width: WIDTH, height: HEIGHT }
          }
          className={
            isMobile
              ? "fixed inset-0 z-50 flex flex-col bg-background"
              : "fixed z-50 flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          }
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`flex items-center gap-2 px-3 py-2 border-b border-border ${isMobile ? "" : "cursor-grab active:cursor-grabbing select-none"}`}
          >
            {!isMobile && (
              <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" data-no-drag={false} />
            )}
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={otherAvatar} />
              <AvatarFallback className="text-[10px]">
                {otherName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-display text-sm truncate flex-1">{otherName}</p>
            <button
              data-no-drag
              type="button"
              onClick={expand}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Open in messages"
              title="Open in Messages"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              data-no-drag
              type="button"
              onClick={close}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {threadId ? (
            <ThreadView threadId={threadId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingDMWindow;
