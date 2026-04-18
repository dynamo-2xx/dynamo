import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useThreadMessages } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";

interface ThreadViewProps {
  threadId: string;
  className?: string;
}

/**
 * Shared message bubbles + composer used by MessagesPage and FloatingDMWindow.
 * Header is rendered by the parent so each surface can style it differently.
 */
const ThreadView = ({ threadId, className }: ThreadViewProps) => {
  const { user } = useAuth();
  const { messages, loading, send, markRead } = useThreadMessages(threadId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead();
  }, [threadId, messages.length, markRead]);

  useEffect(() => {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
    );
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    const ok = await send(body);
    if (!ok) setInput(body);
    setSending(false);
  };

  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground font-body py-8">
            No messages yet. Say hello.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm font-body whitespace-pre-wrap break-words",
                    mine
                      ? "bg-foreground text-background rounded-br-sm"
                      : "bg-accent text-foreground rounded-bl-sm",
                  )}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-2 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          className="flex-1 resize-none bg-accent rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-foreground/20 max-h-32"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center disabled:opacity-40 shrink-0"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ThreadView;
