import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import LiveArgumentMap from "./LiveArgumentMap";

interface ArgumentNode {
  id: string;
  content: string;
  argumentType: string;
  sideLabel: string;
  sideOrder: number;
  participantId: string;
  parentArgumentId: string | null;
  createdAt: string;
  isEdited: boolean;
}

interface ArgumentMapOverlayProps {
  open: boolean;
  onClose: () => void;
  arguments: ArgumentNode[];
  subtopicTitle?: string;
}

/**
 * Translucent floating panel that overlays the camera feed and renders
 * the existing LiveArgumentMap. Closes on backdrop click or × button.
 */
const ArgumentMapOverlay = ({ open, onClose, arguments: args, subtopicTitle }: ArgumentMapOverlayProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
            className="absolute top-4 left-4 z-40 w-[min(420px,calc(100%-2rem))] max-h-[70vh] flex flex-col rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                  Live insights
                </p>
                <h3 className="text-sm font-display font-semibold text-foreground">
                  Argument map{subtopicTitle ? ` · ${subtopicTitle}` : ""}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-foreground/10 transition-colors"
                aria-label="Close argument map"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <LiveArgumentMap arguments={args} compact />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ArgumentMapOverlay;
