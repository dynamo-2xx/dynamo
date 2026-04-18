import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  debate_id: string | null;
  interest_id: string | null;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data || []) as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime — push new notifications into the list.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as AppNotification, ...prev]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
  }, [user]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  return { items, loading, unreadCount, refresh, markRead, markAllRead };
}
