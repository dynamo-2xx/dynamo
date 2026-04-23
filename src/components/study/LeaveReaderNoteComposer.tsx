import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, Pin, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PinAnchor {
  kind: "thought" | "my_take";
  excerpt: string;
  char_start: number;
  char_end: number;
}

interface Props {
  onSubmit: (body: string, anchor?: PinAnchor | null) => Promise<unknown>;
  pendingAnchor: PinAnchor | null;
  clearAnchor: () => void;
  ownerName?: string;
}

const LeaveReaderNoteComposer = ({ onSubmit, pendingAnchor, clearAnchor, ownerName }: Props) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Clear stale anchor if textarea cleared between submissions
  }, []);

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    const ok = await onSubmit(body.trim(), pendingAnchor);
    setSending(false);
    if (ok) {
      setBody("");
      clearAnchor();
      toast.success("Note sent");
    } else {
      toast.error("Couldn't send the note");
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="border border-dashed border-border rounded-md p-4 text-center bg-accent/30">
        <p className="text-sm text-muted-foreground font-body mb-2">
          Sign in to leave a note{ownerName ? ` for ${ownerName}` : ""}.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`)
          }
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-body bg-foreground text-background rounded-md hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="border border-foreground/10 rounded-md bg-background p-3" style={{ borderWidth: "0.5px" }}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        Leave a note{ownerName ? ` for ${ownerName}` : ""}
      </div>

      {pendingAnchor && (
        <div className="flex items-start gap-2 mb-2 px-2 py-1.5 rounded bg-accent/40 text-[11px]">
          <Pin className="w-3 h-3 mt-0.5 shrink-0 text-foreground/70" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Pinned to {pendingAnchor.kind === "my_take" ? "My Take" : "Thoughts"}
            </div>
            <p className="italic text-foreground/80 line-clamp-2">“{pendingAnchor.excerpt}”</p>
          </div>
          <button
            type="button"
            onClick={clearAnchor}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded"
            aria-label="Remove pin"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a note. Highlight text above to pin to an excerpt."
          rows={3}
          className="flex-1 resize-none text-sm font-body min-h-[72px]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="h-9 w-9 rounded-md bg-foreground text-background flex items-center justify-center disabled:opacity-40 shrink-0"
          aria-label="Send note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5">⌘/Ctrl + Enter to send</div>
    </div>
  );
};

export default LeaveReaderNoteComposer;