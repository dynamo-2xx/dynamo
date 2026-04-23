import { useState } from "react";
import { Plus, X, Link2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SessionCitation } from "@/hooks/useSessionCitations";

interface CitationEditorProps {
  summaryNodeId: string;
  citation: SessionCitation | null;
  onSave: (text: string, url: string) => void;
  onDelete: () => void;
}

/**
 * Host-only inline citation editor. Renders an "+ Add citation" button when none
 * exists, otherwise an "Edit" pencil. Saves to session_citations.
 */
const CitationEditor = ({ citation, onSave, onDelete }: CitationEditorProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(citation?.text || "");
  const [url, setUrl] = useState(citation?.url || "");

  const handleSave = () => {
    const t = text.trim();
    if (!t) return;
    onSave(t, url.trim());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {citation ? (
            <>
              <Link2 className="w-3 h-3" /> Edit citation
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" /> Add citation
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Research citation
        </p>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Source description"
          className="mb-2 text-xs"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… (optional)"
          className="mb-3 text-xs"
        />
        <div className="flex justify-between">
          {citation ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-3 h-3 mr-1" />
              Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CitationEditor;