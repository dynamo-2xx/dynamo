import { X, Mail } from "lucide-react";
import ReaderNoteCard from "./ReaderNoteCard";
import type { ReaderNote } from "@/hooks/useReaderNotes";

interface Props {
  open: boolean;
  onClose: () => void;
  notes: ReaderNote[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onJump?: (note: ReaderNote) => void;
}

/**
 * Owner-side envelope inbox: lists every reader note left on the notebook.
 * Renders as an absolutely-positioned slide-in panel inside the parent
 * notebook container (parent must be position: relative).
 */
const ReaderNotesPanel = ({ open, onClose, notes, onDismiss, onClearAll, onJump }: Props) => {
  if (!open) return null;

  const undismissedCount = notes.filter((n) => !n.dismissed_from_thoughts).length;

  return (
    <div
      className="absolute inset-0 z-30 bg-background flex flex-col animate-in slide-in-from-right duration-200"
      role="dialog"
      aria-label="Notes from readers"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Mail className="w-3 h-3" />
          Notes from readers · {notes.length}
        </div>
        <div className="flex items-center gap-2">
          {undismissedCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
            aria-label="Close inbox"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <p className="text-xs italic text-muted-foreground text-center py-8">
            No notes yet. When someone leaves a note on your shared notebook it will show up here.
          </p>
        ) : (
          notes.map((n) => (
            <ReaderNoteCard
              key={n.id}
              note={n}
              onDismiss={n.dismissed_from_thoughts ? undefined : () => onDismiss(n.id)}
              onJump={n.anchor_excerpt && onJump ? () => onJump(n) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ReaderNotesPanel;