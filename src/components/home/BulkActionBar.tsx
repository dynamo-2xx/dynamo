import { Globe, Lock, Archive, Trash2, X } from "lucide-react";

interface Props {
  count: number;
  busy?: boolean;
  onCancel: () => void;
  onMakePublic: () => void;
  onMakePrivate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const BulkActionBar = ({ count, busy, onCancel, onMakePublic, onMakePrivate, onArchive, onDelete }: Props) => {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(4rem+0.75rem+env(safe-area-inset-bottom))] md:bottom-6 z-40 w-[calc(100%-1rem)] max-w-2xl">
      <div className="bg-background border border-border shadow-lg rounded-full px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-2 overflow-x-auto">
        <button
          onClick={onCancel}
          disabled={busy}
          className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 rounded-full hover:bg-secondary flex items-center justify-center shrink-0"
          aria-label="Cancel selection"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-xs sm:text-sm font-body shrink-0 px-1">
          <span className="tabular-nums">{count}</span>
          <span className="hidden sm:inline"> selected</span>
        </span>
        <div className="h-5 w-px bg-border shrink-0 mx-1" />
        <button
          onClick={onMakePublic}
          disabled={busy || count === 0}
          aria-label="Make public"
          className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3 sm:py-1.5 rounded-full text-xs font-body hover:bg-secondary disabled:opacity-40 shrink-0"
        >
          <Globe className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Public</span>
        </button>
        <button
          onClick={onMakePrivate}
          disabled={busy || count === 0}
          aria-label="Make private"
          className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3 sm:py-1.5 rounded-full text-xs font-body hover:bg-secondary disabled:opacity-40 shrink-0"
        >
          <Lock className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Private</span>
        </button>
        <button
          onClick={onArchive}
          disabled={busy || count === 0}
          aria-label="Archive"
          className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3 sm:py-1.5 rounded-full text-xs font-body hover:bg-secondary disabled:opacity-40 shrink-0"
        >
          <Archive className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Archive</span>
        </button>
        <button
          onClick={onDelete}
          disabled={busy || count === 0}
          aria-label="Delete"
          className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3 sm:py-1.5 rounded-full text-xs font-body text-destructive hover:bg-destructive/10 disabled:opacity-40 shrink-0"
        >
          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
