import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReaderNote {
  id: string;
  notebook_id: string;
  sender_id: string;
  body: string;
  anchor_kind: "thought" | "my_take" | null;
  anchor_excerpt: string | null;
  anchor_char_start: number | null;
  anchor_char_end: number | null;
  dm_thread_id: string | null;
  dismissed_from_thoughts: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender_display_name?: string | null;
  sender_avatar_url?: string | null;
}

/**
 * Owner-side: load reader notes left on a notebook the current user owns,
 * with realtime updates and helpers to dismiss / mark all read.
 */
export function useReaderNotes(notebookId: string | null | undefined) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!notebookId || !user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows } = await (supabase as any)
      .from("notebook_reader_notes")
      .select("*")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false });
    const list = (rows || []) as ReaderNote[];
    if (list.length === 0) {
      setNotes([]);
      setLoading(false);
      return;
    }
    const senderIds = Array.from(new Set(list.map((n) => n.sender_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", senderIds);
    const profMap = new Map(
      (profs || []).map((p: any) => [p.user_id, p]),
    );
    setNotes(
      list.map((n) => ({
        ...n,
        sender_display_name: profMap.get(n.sender_id)?.display_name ?? null,
        sender_avatar_url: profMap.get(n.sender_id)?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  }, [notebookId, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!notebookId || !user) return;
    const channel = supabase
      .channel(`reader-notes-${notebookId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notebook_reader_notes",
          filter: `notebook_id=eq.${notebookId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [notebookId, user, load]);

  const dismiss = useCallback(
    async (noteId: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, dismissed_from_thoughts: true, read_at: n.read_at ?? new Date().toISOString() }
            : n,
        ),
      );
      await (supabase as any)
        .from("notebook_reader_notes")
        .update({
          dismissed_from_thoughts: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", noteId);
    },
    [],
  );

  const markRead = useCallback(async (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n,
      ),
    );
    await (supabase as any)
      .from("notebook_reader_notes")
      .update({ read_at: new Date().toISOString() })
      .eq("id", noteId)
      .is("read_at", null);
  }, []);

  const clearAll = useCallback(async () => {
    if (!notebookId) return;
    const now = new Date().toISOString();
    setNotes((prev) =>
      prev.map((n) => ({
        ...n,
        dismissed_from_thoughts: true,
        read_at: n.read_at ?? now,
      })),
    );
    await (supabase as any)
      .from("notebook_reader_notes")
      .update({ dismissed_from_thoughts: true, read_at: now })
      .eq("notebook_id", notebookId)
      .eq("dismissed_from_thoughts", false);
  }, [notebookId]);

  const unreadCount = notes.filter((n) => !n.read_at).length;
  const inThoughts = notes.filter((n) => !n.dismissed_from_thoughts);

  return { notes, inThoughts, unreadCount, loading, dismiss, markRead, clearAll, refresh: load };
}