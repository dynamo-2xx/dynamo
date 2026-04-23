import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CmmQueueRow {
  id: string;
  debate_id: string;
  user_id: string;
  position_text: string;
  preferred_subtopic_id: string | null;
  status: "waiting" | "active" | "completed" | "skipped" | "withdrawn";
  queue_index: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface CmmQueueRowWithProfile extends CmmQueueRow {
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Subscribes to the cmm_queue for a given debate, returning all rows + a hydrated
 * profile map. Realtime updates push new/changed rows automatically.
 */
export function useCmmQueue(debateId: string | undefined) {
  const [rows, setRows] = useState<CmmQueueRowWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!debateId) return;
    const { data, error } = await supabase
      .from("cmm_queue" as any)
      .select("*")
      .eq("debate_id", debateId)
      .order("queue_index", { ascending: true });
    if (error) {
      console.error("[useCmmQueue] fetch failed:", error);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as CmmQueueRow[];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      (profs ?? []).forEach((p: any) =>
        profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }),
      );
    }
    setRows(
      list.map((r) => ({
        ...r,
        display_name: profileMap.get(r.user_id)?.display_name ?? null,
        avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  }, [debateId]);

  useEffect(() => {
    if (!debateId) return;
    fetchAll();
    const channel = supabase
      .channel(`cmm_queue:${debateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cmm_queue", filter: `debate_id=eq.${debateId}` },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [debateId, fetchAll]);

  return { rows, loading, refresh: fetchAll };
}