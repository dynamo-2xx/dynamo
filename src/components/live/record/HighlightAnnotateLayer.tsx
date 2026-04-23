import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface HighlightAnnotateLayerProps {
  containerSelector: string;
  onAnnotate: (input: {
    node_kind: "summary" | "transcript" | "argument";
    node_id: string;
    excerpt: string;
    char_start: number;
    char_end: number;
    note: string;
  }) => void;
}

/**
 * Listens for text selections inside a container; when a selection lands on
 * an element with [data-summary-node-id] or [data-entry-id], shows a
 * floating "Annotate" chip near the selection. Excludes hover-preview bubbles.
 */
const HighlightAnnotateLayer = ({ containerSelector, onAnnotate }: HighlightAnnotateLayerProps) => {
  const [chip, setChip] = useState<{
    top: number;
    left: number;
    excerpt: string;
    node_kind: "summary" | "transcript" | "argument";
    node_id: string;
    char_start: number;
    char_end: number;
  } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [note, setNote] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (!popoverOpen) setChip(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const container = document.querySelector(containerSelector);
      if (!container) return;
      const anchor = range.commonAncestorContainer;
      const anchorEl =
        anchor.nodeType === Node.ELEMENT_NODE
          ? (anchor as Element)
          : anchor.parentElement;
      if (!anchorEl || !container.contains(anchorEl)) {
        setChip(null);
        return;
      }
      // Reject selections inside a hover-preview bubble (preview only).
      if (anchorEl.closest("[data-preview-bubble]")) {
        setChip(null);
        return;
      }
      const summaryEl = anchorEl.closest("[data-summary-node-id]") as HTMLElement | null;
      const transcriptEl = anchorEl.closest("[data-entry-id]") as HTMLElement | null;
      const argumentEl = anchorEl.closest("[data-argument-id]") as HTMLElement | null;
      const node_id =
        summaryEl?.dataset.summaryNodeId ||
        transcriptEl?.dataset.entryId ||
        argumentEl?.dataset.argumentId;
      const node_kind: "summary" | "transcript" | "argument" = summaryEl
        ? "summary"
        : transcriptEl
          ? "transcript"
          : "argument";
      if (!node_id) {
        setChip(null);
        return;
      }
      const excerpt = sel.toString().trim();
      if (excerpt.length < 2) {
        setChip(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setChip({
        top: window.scrollY + rect.top - 36,
        left: window.scrollX + rect.right - 8,
        excerpt,
        node_kind,
        node_id,
        char_start: range.startOffset,
        char_end: range.endOffset,
      });
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [containerSelector, popoverOpen]);

  const save = useCallback(() => {
    if (!chip) return;
    onAnnotate({
      node_kind: chip.node_kind,
      node_id: chip.node_id,
      excerpt: chip.excerpt,
      char_start: chip.char_start,
      char_end: chip.char_end,
      note: note.trim(),
    });
    setNote("");
    setPopoverOpen(false);
    setChip(null);
    window.getSelection()?.removeAllRanges();
  }, [chip, note, onAnnotate]);

  if (!chip) return null;

  return (
    <div
      style={{ position: "absolute", top: chip.top, left: chip.left, zIndex: 60 }}
      className="pointer-events-auto"
    >
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-full bg-foreground text-background shadow-md hover:opacity-90"
          >
            <Pencil className="w-3 h-3" />
            Annotate
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Highlighted
          </p>
          <p className="text-xs italic text-foreground/80 line-clamp-3 mb-2">"{chip.excerpt}"</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)…"
            className="text-xs min-h-[80px] mb-2"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPopoverOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default HighlightAnnotateLayer;