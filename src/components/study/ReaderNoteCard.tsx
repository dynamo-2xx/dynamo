import { X } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReaderNote } from "@/hooks/useReaderNotes";
import { cn } from "@/lib/utils";

interface Props {
  note: ReaderNote;
  onDismiss?: () => void;
  onJump?: () => void;
  compact?: boolean;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ReaderNoteCard = ({ note, onDismiss, onJump, compact }: Props) => {
  const name = note.sender_display_name || "Someone";
  const initial = (name[0] || "?").toUpperCase();

  return (
    <div
      className={cn(
        "relative rounded-md border border-foreground/10 bg-background p-3 text-sm font-body",
        compact ? "p-2.5" : "p-3",
      )}
      style={{ borderWidth: "0.5px" }}
    >
      <div className="flex items-start gap-2">
        <Link
          to={`/u/${note.sender_id}`}
          className="shrink-0 w-7 h-7 rounded-full bg-accent overflow-hidden flex items-center justify-center text-[11px] font-medium text-foreground/70"
          aria-label={`View ${name}`}
        >
          {note.sender_avatar_url ? (
            <img src={note.sender_avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
            <span className="font-medium text-foreground">Note from {name}</span>
            <span>· {fmt(note.created_at)}</span>
          </div>

          {note.anchor_excerpt && (
            <button
              type="button"
              onClick={onJump}
              disabled={!onJump}
              className={cn(
                "block w-full text-left mb-1.5 pl-2 border-l-2 border-foreground/20 text-[11px] italic text-muted-foreground line-clamp-2",
                onJump && "hover:text-foreground hover:border-foreground/50 cursor-pointer",
              )}
              title={onJump ? "Jump to source" : undefined}
            >
              “{note.anchor_excerpt}”
              <span className="ml-1 not-italic text-[10px] uppercase tracking-wider">
                · {note.anchor_kind === "my_take" ? "My Take" : "Thought"}
              </span>
            </button>
          )}

          <p className="whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
            {note.body}
          </p>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 -mt-1 -mr-1 p-1 text-muted-foreground hover:text-foreground rounded"
            aria-label="Dismiss"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ReaderNoteCard;