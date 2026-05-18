import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DMThread {
  id: string;
  user_a: string;
  user_b: string;
  debate_id: string | null;
  last_message_at: string;
  created_at: string;
  other_user_id: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message_body: string | null;
  unread_count: number;
}

export interface DMMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

/** Fetch the inbox of threads for the current user, with previews & unread counts. */
export function useThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows } = await (supabase as any)
      .from("dm_threads")
      .select("*")
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
          ...t,
          other_user_id: otherId,
          other_display_name: prof?.display_name ?? null,
          other_avatar_url: prof?.avatar_url ?? null,
          last_message_body: lastByThread.get(t.id) ?? null,
          unread_count: unreadByThread.get(t.id) ?? 0,
        } as DMThread;
      }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: refresh on any new dm_message
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dm_messages" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { threads, loading, refresh };
}

/** Total unread DM count across all threads — for the sidebar badge. */
export function useUnreadDMCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { count: c } = await (supabase as any)
      .from("dm_messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", user.id);
    setCount(c || 0);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_messages" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return count;
}

/** Messages for a single thread, with realtime + sendMessage + markRead. */
export function useThreadMessages(threadId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("dm_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages((data || []) as DMMessage[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`dm-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as any).id)
              ? prev
              : [...prev, payload.new as DMMessage],
          );
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const send = useCallback(
    async (body: string) => {
      if (!user || !threadId || !body.trim()) return false;
      const { error } = await (supabase as any).from("dm_messages").insert({
        thread_id: threadId,
        sender_id: user.id,
        body: body.trim(),
      });
      if (error) {
        const { handleSilencedError } = await import("@/lib/silencedError");
        handleSilencedError(error);
      }
      return !error;
    },
    [user, threadId],
  );

  const markRead = useCallback(async () => {
    if (!user || !threadId) return;
    await (supabase as any)
      .from("dm_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  }, [user, threadId]);

  return { messages, loading, send, markRead };
}

/** Get-or-create a thread between current user and `otherUserId` for a debate. */
export async function getOrCreateThread(otherUserId: string, debateId?: string | null) {
  const { data, error } = await (supabase as any).rpc("get_or_create_dm_thread", {
    _other_user: otherUserId,
    _debate_id: debateId ?? null,
  });
  if (error) {
    console.error("getOrCreateThread:", error);
    return null;
  }
  return data as string;
}
