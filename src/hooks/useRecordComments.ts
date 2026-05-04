import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RecordType = "debate" | "live_session" | "change_my_mind";

export interface RecordComment {
  id: string;
  record_type: RecordType;
  record_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

async function attachAuthors(rows: RecordComment[]): Promise<RecordComment[]> {
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length === 0) return rows;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", ids);
  const map = new Map<string, { name: string | null; avatar: string | null }>();
  (data || []).forEach((p: any) =>
    map.set(p.user_id, { name: p.display_name, avatar: p.avatar_url }),
  );
  return rows.map((r) => ({
    ...r,
    author_name: map.get(r.user_id)?.name ?? null,
    author_avatar: map.get(r.user_id)?.avatar ?? null,
  }));
}

export function useRecordComments(recordType: RecordType, recordId: string | null | undefined) {
  const { user } = useAuth();
  const [items, setItems] = useState<RecordComment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!recordId) return;
    const { data } = await (supabase as any)
      .from("record_comments")
      .select("*")
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
    const enriched = await attachAuthors((data || []) as RecordComment[]);
    setItems(enriched);
    setLoading(false);
  }, [recordType, recordId]);

  useEffect(() => {
    if (!recordId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
    const channel = supabase
      .channel(`record-comments-${recordType}-${recordId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "record_comments", filter: `record_id=eq.${recordId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordType, recordId, refresh]);

  const post = useCallback(
    async (body: string, parentId?: string | null) => {
      if (!user || !recordId) return { error: new Error("Not signed in") };
      const trimmed = body.trim();
      if (!trimmed) return { error: new Error("Empty") };
      const { error } = await (supabase as any).from("record_comments").insert({
        record_type: recordType,
        record_id: recordId,
        parent_id: parentId ?? null,
        user_id: user.id,
        body: trimmed.slice(0, 4000),
      });
      if (!error) await refresh();
      return { error };
    },
    [recordType, recordId, user, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      await (supabase as any).from("record_comments").delete().eq("id", id);
      setItems((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    },
    [user],
  );

  return { items, loading, post, remove, refresh };
}