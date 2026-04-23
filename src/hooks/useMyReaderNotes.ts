import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ReaderNote } from "./useReaderNotes";

export interface SharedNotebookForReader {
  id: string;
  session_id: string;
  owner_id: string;
  display_title: string | null;
  thoughts: any;
  my_take: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
  session_title: string | null;
  session_created_at: string | null;
  my_notes: ReaderNote[];
}

/**
 * Recipient-side: load a shared notebook + the caller's own notes,
 * with submit / update / delete helpers.
 */
export function useMyReaderNotes(token: string | undefined) {
  const { user } = useAuth();
  const [notebook, setNotebook] = useState<SharedNotebookForReader | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    if (user) {
      const { data } = await (supabase.rpc as any)("get_shared_notebook_for_reader", {
        _token: token,
      });
      const row = (data && data[0]) || null;
      setNotebook(row);
    } else {
      const { data } = await (supabase.rpc as any)("get_shared_notebook", { _token: token });
      const row = (data && data[0]) || null;
      if (row) {
        setNotebook({
          ...row,
          owner_id: "",
          my_notes: [],
        });
      } else {
        setNotebook(null);
      }
    }
    setLoading(false);
  }, [token, user]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (
      body: string,
      anchor?: {
        kind: "thought" | "my_take";
        excerpt: string;
        char_start: number;
        char_end: number;
      } | null,
    ): Promise<ReaderNote | null> => {
      if (!token || !user || !body.trim()) return null;
      const { data, error } = await (supabase.rpc as any)("submit_reader_note", {
        _token: token,
        _body: body.trim(),
        _anchor_kind: anchor?.kind ?? null,
        _anchor_excerpt: anchor?.excerpt ?? null,
        _anchor_char_start: anchor?.char_start ?? null,
        _anchor_char_end: anchor?.char_end ?? null,
      });
      if (error) {
        console.error("submit_reader_note:", error);
        return null;
      }
      const note = (Array.isArray(data) ? data[0] : data) as ReaderNote;
      if (note) {
        setNotebook((prev) =>
          prev ? { ...prev, my_notes: [note, ...prev.my_notes] } : prev,
        );
      }
      return note;
    },
    [token, user],
  );

  const update = useCallback(async (noteId: string, body: string) => {
    if (!body.trim()) return;
    const { data } = await (supabase as any)
      .from("notebook_reader_notes")
      .update({ body: body.trim() })
      .eq("id", noteId)
      .select()
      .maybeSingle();
    if (data) {
      setNotebook((prev) =>
        prev
          ? {
              ...prev,
              my_notes: prev.my_notes.map((n) => (n.id === noteId ? (data as ReaderNote) : n)),
            }
          : prev,
      );
    }
  }, []);

  const remove = useCallback(async (noteId: string) => {
    setNotebook((prev) =>
      prev ? { ...prev, my_notes: prev.my_notes.filter((n) => n.id !== noteId) } : prev,
    );
    await (supabase as any).from("notebook_reader_notes").delete().eq("id", noteId);
  }, []);

  return { notebook, loading, submit, update, remove, refresh: load };
}