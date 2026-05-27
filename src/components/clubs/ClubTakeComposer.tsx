import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTakeCreate, type Take } from "@/hooks/useTakes";

interface Props {
  clubId: string;
  onPublished: (take: Take) => void;
}

const MAX = 2000;

const ClubTakeComposer = ({ clubId, onPublished }: Props) => {
  const { createTake, busy } = useTakeCreate();
  const [body, setBody] = useState("");

  const submit = async () => {
    if (!body.trim()) return;
    if (body.length > MAX) {
      toast.error(`Takes are limited to ${MAX} characters.`);
      return;
    }
    try {
      const t = await createTake(body, { clubId });
      if (t) {
        setBody("");
        onPublished(t);
        toast.success("Posted to the club");
      }
    } catch (e: any) {
      toast.error(e?.message || "Couldn't publish");
    }
  };

  return (
    <div className="border border-border rounded-xl bg-background overflow-hidden">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share a take with the club…"
        rows={3}
        maxLength={MAX}
        className="w-full bg-transparent resize-none px-4 pt-3 pb-2 text-[15px] font-body text-foreground placeholder:text-muted-foreground outline-none"
      />
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border">
        <span className="text-[11px] text-muted-foreground font-body tabular-nums">
          {body.length}/{MAX}
        </span>
        <Button size="sm" disabled={busy || !body.trim()} onClick={submit} className="h-8">
          {busy ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
};

export default ClubTakeComposer;