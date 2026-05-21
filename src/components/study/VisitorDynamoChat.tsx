import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useVisitorDynamoHistory } from "@/hooks/useVisitorDynamoHistory";

interface Props {
  notebookId: string;
  shareToken: string;
  recordType: "live_session" | "debate" | "change_my_mind";
  recordId: string;
}

/**
 * Visitor-private chat about a published notebook. History is per-browser
 * (localStorage) and never mixes with the owner's Dynamo chat.
 */
const VisitorDynamoChat = ({ notebookId, shareToken, recordType, recordId }: Props) => {
  const { messages, append } = useVisitorDynamoHistory(notebookId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    append({ role: "user", content: text });
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("record-qa", {
        body: {
          recordType,
          recordId,
          sessionId: recordType === "live_session" ? recordId : undefined,
          shareToken,
          messages: [...messages, { role: "user", content: text }],
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Couldn't get a response.");
        return;
      }
      append({ role: "assistant", content: data.reply });
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[60vh] sm:min-h-[480px]">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        <Sparkles className="w-3 h-3" /> Your private chat about this notebook
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1"
      >
        {messages.length === 0 && (
          <p className="text-xs italic text-muted-foreground font-body">
            Ask anything about this notebook. Your chat is private to you — the
            author never sees it.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-foreground text-background rounded-md px-3 py-2 text-sm font-body"
                : "mr-auto max-w-[90%] text-sm font-body text-foreground"
            }
          >
            {m.role === "assistant" ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}
        {loading && (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2 pt-2 border-t border-border">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Ask about this notebook…"
          className="flex-1 resize-none border border-border rounded-md px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-foreground/40"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !input.trim()}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-foreground text-background disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default VisitorDynamoChat;