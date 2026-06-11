import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CoverImageUploader from "@/components/upload/CoverImageUploader";
import { toast } from "sonner";

export interface RecordEditValues {
  title?: string;
  description: string | null;
  coverImageUrl: string | null;
}

interface Props {
  /** Current values to seed the form. */
  initial: RecordEditValues;
  /** Persist handler — return a promise; the dialog closes on success. */
  onSave: (next: RecordEditValues) => Promise<void> | void;
  /** Title shown in the header. Defaults to "Edit record". */
  dialogTitle?: string;
  /** Show a title input. Defaults to true. */
  allowTitleEdit?: boolean;
  /** Seed for the cover gradient preview. */
  coverSeed?: string;
}

/**
 * Owner-only edit affordance for the cover image, title, and description
 * of any record (debate / live / imported). Renders a pencil button as the
 * trigger so it can be dropped into the hero overlay.
 */
const RecordEditDialog = ({
  initial,
  onSave,
  dialogTitle = "Edit record",
  allowTitleEdit = true,
  coverSeed,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.coverImageUrl ?? null);

  // Re-seed when the dialog opens, in case the underlying record was edited
  // elsewhere since the last open.
  useEffect(() => {
    if (open) {
      setTitle(initial.title ?? "");
      setDescription(initial.description ?? "");
      setCoverUrl(initial.coverImageUrl ?? null);
    }
  }, [open, initial.title, initial.description, initial.coverImageUrl]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: allowTitleEdit ? title.trim() : undefined,
        description: description.trim() ? description.trim() : null,
        coverImageUrl: coverUrl,
      });
      toast.success("Record updated");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Edit record"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-background/90 hover:bg-background border border-border text-xs font-body font-medium text-foreground transition-colors backdrop-blur-sm"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {allowTitleEdit && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1.5 block">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What's this record about?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-y"
            />
          </div>
          <CoverImageUploader
            value={coverUrl}
            onChange={setCoverUrl}
            seed={coverSeed || title || "cover"}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="px-3 py-2 rounded-lg text-sm font-body text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-body font-semibold bg-foreground text-background hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordEditDialog;