import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Send, ArrowLeft, MessageCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useThreads, useThreadMessages } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { threadId: routeThreadId } = useParams<{ threadId: string }>();
  const { threads, loading } = useThreads();
  const [activeId, setActiveId] = useState<string | undefined>(routeThreadId);

  useEffect(() => {
    if (routeThreadId) setActiveId(routeThreadId);
  }, [routeThreadId]);

  // Auto-pick first thread on desktop if none selected
  useEffect(() => {
    if (!activeId && threads.length > 0 && window.innerWidth >= 768) {
      setActiveId(threads[0].id);
    }
  }, [threads, activeId]);

  const activeThread = threads.find((t) => t.id === activeId);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <h1 className="font-display text-3xl mb-6">Messages</h1>

        <div className="grid md:grid-cols-[320px_1fr] gap-0 border border-border rounded-xl overflow-hidden h-[calc(100vh-220px)] min-h-[480px]">
          {/* Thread list */}
          <div
            className={cn(
              "border-r border-border overflow-y-auto bg-background",
              activeId && "hidden md:block",
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm font-body">No messages yet.</p>
                <p className="text-xs font-body mt-1">
                  Express interest on a debate to start a conversation.
                </p>
              </div>
            ) : (
              <ul>
                {threads.map((t) => {
                  const active = activeId === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(t.id);
                          navigate(`/messages/${t.id}`, { replace: true });
                        }}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border",
                          active && "bg-accent",
                        )}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={t.other_avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {(t.other_display_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-body font-medium truncate">
                              {t.other_display_name || "Unknown user"}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-body shrink-0">
                              {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: false })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-body truncate mt-0.5">
                            {t.last_message_body || "No messages yet"}
                          </p>
                        </div>
                        {t.unread_count > 0 && (
                          <span className="ml-auto self-center min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-body font-medium flex items-center justify-center">
                            {t.unread_count}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Active thread */}
          <div className={cn("flex flex-col bg-background", !activeId && "hidden md:flex")}>
            {activeThread ? (
              <ActiveThread
                key={activeThread.id}
                threadId={activeThread.id}
                otherName={activeThread.other_display_name || "Unknown"}
                otherAvatar={activeThread.other_avatar_url}
                onBack={() => {
                  setActiveId(undefined);
                  navigate("/messages", { replace: true });
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground font-body">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const ActiveThread = ({
  threadId,
  otherName,
  otherAvatar,
  onBack,
}: {
  threadId: string;
  otherName: string;
  otherAvatar: string | null;
  onBack: () => void;
}) => {
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
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Avatar className="w-8 h-8">
          <AvatarImage src={otherAvatar ?? undefined} />
          <AvatarFallback className="text-[10px]">
            {otherName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <p className="font-display text-base">{otherName}</p>
      </div>

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
          className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};

export default MessagesPage;
