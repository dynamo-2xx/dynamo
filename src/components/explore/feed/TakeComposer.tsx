import { useState } from "react";
import { BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTakeCreate, type Take } from "@/hooks/useTakes";
import NotebookPickerDialog from "./NotebookPickerDialog";

interface Props {
  onPublished: (take: Take) => void;
}

const MAX = 2000;

const TakeComposer = ({ onPublished }: Props) => {
  const { user } = useAuth();
  const { createTake, busy } = useTakeCreate();
  const [body, setBody] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!user) {
    return (
      <div className="border border-border rounded-xl px-4 py-3 bg-background text-sm font-body text-muted-foreground">
        Sign in to share a take or publish a notebook.
      </div>
    );
  }

  const submit = async () => {
    if (!body.trim()) return;
    if (body.length > MAX) {
      toast.error(`Takes are limited to ${MAX} characters.`);
      return;
    }
    try {
      const t = await createTake(body);
      if (t) {
        setBody("");
        onPublished(t);
        toast.success("Take published");
      }
    } catch (e: any) {
      toast.error(e?.message || "Couldn't publish");
    }
  };

  return (
    <>
      <div className="border border-border rounded-xl bg-background overflow-hidden">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a take…"
          rows={3}
          maxLength={MAX}
          className="w-full bg-transparent resize-none px-4 pt-3 pb-2 text-[15px] font-body text-foreground placeholder:text-muted-foreground outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border text-xs font-body text-foreground hover:bg-muted transition-colors"
            title="Publish a notebook"
          >
            <BookPlus className="w-3.5 h-3.5" /> Notebook
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-body tabular-nums">
              {body.length}/{MAX}
            </span>
            <Button size="sm" disabled={busy || !body.trim()} onClick={submit} className="h-8">
              {busy ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </div>
      <NotebookPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
};

export default TakeComposer;