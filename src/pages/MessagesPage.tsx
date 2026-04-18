import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useThreads } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThreadView from "@/components/messages/ThreadView";

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
          <div className={cn("flex flex-col bg-background min-h-0", !activeId && "hidden md:flex")}>
            {activeThread ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(undefined);
                      navigate("/messages", { replace: true });
                    }}
                    className="md:hidden text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activeThread.other_avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(activeThread.other_display_name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-display text-base">
                    {activeThread.other_display_name || "Unknown"}
                  </p>
                </div>
                <ThreadView key={activeThread.id} threadId={activeThread.id} />
              </>
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

export default MessagesPage;
