import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RichTextEditor, { type Editor } from "@/components/study/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

interface Props {
  myTake: string;
  setMyTake: (v: string) => void;
  onDelete: () => void;
  onPublish: () => Promise<void> | void;
  onUnpublish: () => Promise<void> | void;
  isPublished: boolean;
  onEditorReady?: (e: Editor | null) => void;
  onFocus?: () => void;
  recordType?: "live_session" | "debate" | "change_my_mind";
  recordId?: string | null;
}

const MyTakeTab = ({
  myTake,
  setMyTake,
  onDelete,
  onPublish,
  onUnpublish,
  isPublished,
  onEditorReady,
  onFocus,
  recordType,
  recordId,
}: Props) => {
  const [suggesting, setSuggesting] = useState(false);
  const plainLen = stripHtml(myTake).length;

  const handleSuggest = async () => {
    if (!recordType || !recordId) return;
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("consolidate-notebook", {
        body: { recordType, recordId },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Couldn't generate a suggestion.");
        return;
      }
      const draft: string = data?.myTake || data?.draft || "";
      if (!draft) {
        toast.error("No suggestion returned.");
        return;
      }
      // Stage as a draft the user can accept/edit/discard — replace current.
      setMyTake(`<p>${draft.replace(/\n/g, "<br/>")}</p>`);
      toast.success("Draft suggested — edit or clear to keep your own.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-2 border border-border rounded-md p-3">
        <RichTextEditor
          value={myTake}
          onChange={setMyTake}
          onEditorReady={onEditorReady}
          onFocus={onFocus}
          placeholder="Write your take in your own words…"
          minHeight="220px"
          maxPlainLength={280}
        />
        {plainLen > 0 && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
            aria-label="Clear take"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] text-muted-foreground font-body">
          {plainLen}/280
        </span>
        {recordType && recordId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={suggesting}
            onClick={handleSuggest}
          >
            {suggesting ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            Suggest from my Thoughts + Annotations
          </Button>
        )}
      </div>
      <div className="mt-auto flex justify-end gap-2 pt-2 border-t border-foreground/10">
        {isPublished ? (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await onUnpublish();
              toast.success("Unpublished from your profile");
            }}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={plainLen === 0}
            onClick={async () => {
              await onPublish();
              toast.success("Published to your profile");
            }}
          >
            Publish to profile
          </Button>
        )}
      </div>
    </div>
  );
};

export default MyTakeTab;