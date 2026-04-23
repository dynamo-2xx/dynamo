import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  myTake: string;
  setMyTake: (v: string) => void;
  onDelete: () => void;
  onPublish: () => Promise<void> | void;
  onUnpublish: () => Promise<void> | void;
  isPublished: boolean;
}

const MyTakeTab = ({ myTake, setMyTake, onDelete, onPublish, onUnpublish, isPublished }: Props) => {
  if (!myTake) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Your take will appear here after you leave this page. The AI will consolidate your thoughts
        and annotations into a clean summary.
      </p>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-2">
        <Textarea
          value={myTake}
          onChange={(e) => setMyTake(e.target.value)}
          className="w-full min-h-[220px] resize-none border-foreground/10 text-sm pr-7 font-body"
        />
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-destructive"
          aria-label="Delete take"
        >
          <X className="w-3.5 h-3.5" />
        </button>
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