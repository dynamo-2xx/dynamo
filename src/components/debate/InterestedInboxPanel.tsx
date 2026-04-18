import { useEffect, useState } from "react";
import { Inbox, Loader2, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFloatingDM } from "@/contexts/FloatingDMContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import InviteFriendsDialog from "./InviteFriendsDialog";

interface InterestedThread {
  id: string;
  other_user_id: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message_body: string | null;
  last_message_at: string;
  unread_count: number;
}

interface JoinedParticipant {
  user_id: string;
  side_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  debateId: string;
  debateTopic: string;
  sides: { id: string; label: string }[];
}

/**
 * Owner-only panel on the preview page showing users who DM'd about this debate.
 * Click a row → opens the global FloatingDMWindow preloaded to that thread.
 */
const InterestedInboxPanel = ({ debateId, debateTopic, sides }: Props) => {
  const { user } = useAuth();
  const { openThread } = useFloatingDM();
  const [threads, setThreads] = useState<InterestedThread[]>([]);
  const [joined, setJoined] = useState<JoinedParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch joined participants (excluding owner)
    const { data: parts } = await supabase
      .from("debate_participants")
      .select("user_id, side_id")
      .eq("debate_id", debateId);
    const partList = (parts || []).filter((p: any) => p.user_id !== user.id);
    if (partList.length > 0) {
      const ids = partList.map((p: any) => p.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setJoined(
        partList.map((p: any) => ({
          user_id: p.user_id,
          side_id: p.side_id ?? null,
          display_name: (profMap.get(p.user_id) as any)?.display_name ?? null,
          avatar_url: (profMap.get(p.user_id) as any)?.avatar_url ?? null,
        })),
      );
    } else {
      setJoined([]);
    }

    const { data: rows } = await (supabase as any)
      .from("dm_threads")
      .select("*")
      .eq("debate_id", debateId)
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    const list = (rows || []) as any[];
    if (list.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const otherIds = Array.from(
      new Set(list.map((t) => (t.user_a === user.id ? t.user_b : t.user_a))),
    );
    const threadIds = list.map((t) => t.id);

    const [{ data: profs }, { data: msgs }, { data: unread }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", otherIds),
      (supabase as any)
        .from("dm_messages")
        .select("thread_id, body, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("dm_messages")
        .select("thread_id")
        .in("thread_id", threadIds)
        .is("read_at", null)
        .neq("sender_id", user.id),
    ]);

    const profMap = new Map<string, any>();
    (profs || []).forEach((p: any) => profMap.set(p.user_id, p));
    const lastByThread = new Map<string, string>();
    (msgs || []).forEach((m: any) => {
      if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m.body);
    });
    const unreadByThread = new Map<string, number>();
    (unread || []).forEach((m: any) => {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) || 0) + 1);
    });

    setThreads(
      list.map((t) => {
        const otherId = t.user_a === user.id ? t.user_b : t.user_a;
        const prof = profMap.get(otherId);
        return {
          id: t.id,
          other_user_id: otherId,
          other_display_name: prof?.display_name ?? null,
          other_avatar_url: prof?.avatar_url ?? null,
          last_message_body: lastByThread.get(t.id) ?? null,
          last_message_at: t.last_message_at,
          unread_count: unreadByThread.get(t.id) ?? 0,
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    const channel = supabase
      .channel(`dm-inbox-debate-${debateId}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "debate_participants", filter: `debate_id=eq.${debateId}` }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId, user?.id]);

  return (
    <>
    <div className="bg-background border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
            Interested
          </label>
          {threads.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-body">
              · {threads.length} {threads.length === 1 ? "person" : "people"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-body font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <UserPlus className="w-3 h-3" />
          Invite people
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Inbox className="w-8 h-8 mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm font-body text-muted-foreground">
            No one has reached out yet.
          </p>
          <p className="text-xs font-body text-muted-foreground mt-1">
            Share your debate to get interest.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border -mx-2">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => openThread(t.id)}
                className="w-full flex items-start gap-3 px-2 py-3 text-left hover:bg-accent rounded-md transition-colors"
              >
                <Avatar className="w-9 h-9 shrink-0">
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
                  <span className="self-center min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-body font-medium flex items-center justify-center">
                    {t.unread_count}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
    <InviteFriendsDialog
      open={inviteOpen}
      onOpenChange={setInviteOpen}
      debateId={debateId}
      debateTopic={debateTopic}
      sides={sides}
    />
    </>
  );
};

export default InterestedInboxPanel;
