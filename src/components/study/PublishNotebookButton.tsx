import { useState } from "react";
import { Globe2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface Props {
  notebookId: string;
  shareToken: string | null | undefined;
  isPublished: boolean;
  onPublish: () => Promise<unknown> | unknown;
  onUnpublish: () => Promise<unknown> | unknown;
  onEnsureShareToken: (id: string) => Promise<string | null>;
}

const PublishNotebookButton = ({
  notebookId,
  shareToken,
  isPublished,
  onPublish,
  onUnpublish,
  onEnsureShareToken,
}: Props) => {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = shareToken
    ? `${window.location.origin}/study/shared/${shareToken}`
    : "";

  const handlePublish = async () => {
    setBusy(true);
    try {
      if (!shareToken) await onEnsureShareToken(notebookId);
      await onPublish();
      toast.success("Published to your profile");
    } finally {
      setBusy(false);
    }
  };

  const handleUnpublish = async () => {
    setBusy(true);
    try {
      await onUnpublish();
      toast.success("Unpublished");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Public link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  if (!isPublished) {
    return (
      <Button size="sm" disabled={busy} onClick={handlePublish} className="h-8">
        Publish
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Globe2 className="w-3.5 h-3.5" /> Published
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-2">
        <p className="text-xs text-muted-foreground font-body">
          Anyone with this link can view your notebook.
        </p>
        {publicUrl && (
          <div className="flex items-center gap-1 border border-border rounded px-2 py-1">
            <span className="flex-1 truncate text-[11px] font-mono">{publicUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Copy link"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={handleUnpublish}
            className="text-destructive hover:text-destructive h-7"
          >
            Unpublish
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PublishNotebookButton;