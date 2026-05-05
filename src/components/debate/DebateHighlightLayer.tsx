import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Highlighter, X } from "lucide-react";
import { useSessionAnnotations, type RecordType } from "@/hooks/useSessionAnnotations";
import { toast } from "sonner";

interface Props {
  recordType: RecordType;
  recordId: string;
  /** Optional CSS selector that scopes which regions are annotatable. Defaults to `[data-annotatable]`. */
  selector?: string;
}

/**
 * Mounts a global selection listener. When the user selects text inside any
 * element matching `selector`, a small "Annotate" pill appears near the
 * selection. Tapping it captures the excerpt + opens an inline composer.
 * Saved annotations are written to session_annotations and shown in the
 * notebook's Annotations tab.
 */
const DebateHighlightLayer = ({ recordType, recordId, selector = "[data-annotatable]" }: Props) => {
  const { add } = useSessionAnnotations({ recordType, recordId });
  const [pill, setPill] = useState<{ x: number; y: number; excerpt: string; nodeKind: "transcript" | "summary" | "argument"; nodeId: string } | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (!composerOpen) setPill(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 3) {
        if (!composerOpen) setPill(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const anchorNode = range.commonAncestorContainer;
      const anchorEl =
        (anchorNode.nodeType === 1 ? (anchorNode as Element) : anchorNode.parentElement);
      const region = anchorEl?.closest(selector);
      if (!region) {
        if (!composerOpen) setPill(null);
        return;
      }
      // Determine node kind/id from data attributes if present
      const node = anchorEl?.closest("[data-node-kind]") as HTMLElement | null;
      const nodeKind = (node?.dataset.nodeKind as any) || "argument";
      const nodeId = node?.dataset.nodeId || `region-${Date.now()}`;
      const rect = range.getBoundingClientRect();
      setPill({
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + window.scrollY - 40,
        excerpt: text.slice(0, 1000),
        nodeKind,
        nodeId,
      });
    };
    document.addEventListener("mouseup", handler);
    document.addEventListener("touchend", handler);
    return () => {
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("touchend", handler);
    };
  }, [selector, composerOpen]);

  const save = async () => {
    if (!pill) return;
    const r = await add({
      node_kind: pill.nodeKind,
      node_id: pill.nodeId,
      excerpt: pill.excerpt,
      note: note.trim(),
    });
    if (r) {
      toast.success("Annotation saved", { description: "Open your notebook to view it." });
    } else {
      toast.error("Couldn't save annotation");
    }
    window.getSelection()?.removeAllRanges();
    setPill(null);
    setNote("");
    setComposerOpen(false);
  };

  return (
    <div ref={ref}>
      <AnimatePresence>
        {pill && !composerOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setComposerOpen(true); }}
            style={{ position: "fixed", left: pill.x, top: Math.max(12, pill.y), transform: "translateX(-50%)" }}
            className="z-[60] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg"
          >
            <Highlighter className="w-3.5 h-3.5" />
            Annotate
          </motion.button>
        )}
        {pill && composerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{ position: "fixed", left: pill.x, top: Math.max(12, pill.y), transform: "translateX(-50%)" }}
            className="z-[60] w-[280px] rounded-xl border border-foreground/10 bg-background shadow-xl p-3"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[11px] italic text-foreground/70 line-clamp-2">"{pill.excerpt}"</p>
              <button
                onClick={() => { setPill(null); setComposerOpen(false); setNote(""); window.getSelection()?.removeAllRanges(); }}
                className="text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              rows={2}
              className="w-full resize-none rounded-md border border-foreground/10 bg-background px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={save}
                className="text-xs px-3 py-1.5 rounded-md bg-foreground text-background font-medium hover:opacity-90"
              >
                Save to notebook
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebateHighlightLayer;