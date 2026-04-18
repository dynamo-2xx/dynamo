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
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-40 w-[calc(100%-2rem)] max-w-2xl">
      <div className="bg-background border border-border shadow-lg rounded-full px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={onCancel}
          disabled={busy}
          className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center shrink-0"
          aria-label="Cancel selection"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-sm font-body shrink-0 px-1">{count} selected</span>
        <div className="h-5 w-px bg-border shrink-0 mx-1" />
        <button
          onClick={onMakePublic}
          disabled={busy || count === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body hover:bg-secondary disabled:opacity-40 shrink-0"
        >
          <Globe className="w-3.5 h-3.5" /> Public
        </button>
        <button
          onClick={onMakePrivate}
          disabled={busy || count === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body hover:bg-secondary disabled:opacity-40 shrink-0"
        >
          <Lock className="w-3.5 h-3.5" /> Private
        </button>
        <button
          onClick={onArchive}
          disabled={busy || count === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body hover:bg-secondary disabled:opacity-40 shrink-0"
        >
          <Archive className="w-3.5 h-3.5" /> Archive
        </button>
        <button
          onClick={onDelete}
          disabled={busy || count === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body text-destructive hover:bg-destructive/10 disabled:opacity-40 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
