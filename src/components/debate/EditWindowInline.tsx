import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

interface Props {
  editWindowEndsAt: string;
  canEdit: boolean;
  onEdit: () => void;
}

function fmt(ms: number): string {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

/** Minimal inline edit-window notice. No border, plain-text countdown + Edit. */
const EditWindowInline = ({ editWindowEndsAt, canEdit, onEdit }: Props) => {
  const [ms, setMs] = useState(() => new Date(editWindowEndsAt).getTime() - Date.now());
  useEffect(() => {
    const i = setInterval(() => setMs(new Date(editWindowEndsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(i);
  }, [editWindowEndsAt]);
  const expired = ms <= 0;
  return (
    <div className="inline-flex items-center gap-2 text-xs font-body text-muted-foreground">
      <span>
        {expired ? "Edit window closed" : <>Edit closes in <span className="text-foreground tabular-nums font-medium">{fmt(ms)}</span></>}
      </span>
      {canEdit && !expired && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-foreground hover:underline"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
};

export default EditWindowInline;