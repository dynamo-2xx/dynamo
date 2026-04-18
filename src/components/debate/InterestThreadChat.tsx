import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface Props {
  interestId: string;
  debateId: string;
  otherPartyName?: string;
}

/**
 * Floating round button (bottom-right) that opens a 1:1 chat between the
 * requester and the debate publisher. Both parties can read & post.
 */
const InterestThreadChat = ({ interestId, debateId, otherPartyName }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load + realtime subscription
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("debate_interest_messages")
        .select("id, sender_id, body, created_at")
        .eq("interest_id", interestId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages((data as Message[]) || []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`interest-thread-${interestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "debate_interest_messages",
          filter: `interest_id=eq.${interestId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as Message];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [interestId]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    }
  }, [messages, open]);

  const send = async () => {
    if (!user || !input.trim() || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    const { error } = await (supabase as any).from("debate_interest_messages").insert({
      interest_id: interestId,
      debate_id: debateId,
      sender_id: user.id,
      body,
    });
    if (error) {
      toast.error("Couldn't send message");
      setInput(body);
    }
    setSending(false);
  };

  return (
    <>
      {/* Floating logo button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close coordination chat" : "Open coordination chat"}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-40 w-[min(calc(100vw-3rem),22rem)] h-[28rem] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Coordination</p>
              <p className="text-sm font-display truncate">
                {otherPartyName ? `with ${otherPartyName}` : "Suggest a time or change"}
              </p>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground font-body px-4 py-8">
                  Suggest a time or propose template tweaks. Both you and {otherPartyName || "the other party"} can read this thread.
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm font-body whitespace-pre-wrap break-words",
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
                    send();
                  }
                }}
                placeholder="Suggest a time or change…"
                rows={1}
                className="flex-1 resize-none bg-accent rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-foreground/20 max-h-24"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !input.trim()}
                className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InterestThreadChat;
