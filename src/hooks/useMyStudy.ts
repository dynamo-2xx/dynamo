import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RecordType = "live_session" | "debate" | "change_my_mind";

export interface StudyNotebook {
  id: string;
  session_id: string;
  user_id: string;
  record_type: RecordType;
  record_id: string;
  display_title: string | null;
  thoughts: any;
  my_take: string | null;
  published: boolean;
  published_at: string | null;
  share_token: string | null;
  folder_id: string | null;
  sort_index: number;
  deleted_at: string | null;
  updated_at: string;
  created_at: string;
  // hydrated:
  session_title: string | null;
  session_created_at: string | null;
  session_ended_at: string | null;
  annotation_count: number;
  tags: { id: string; name: string; slug: string }[];
}

export interface StudyFolder {
  id: string;
  user_id: string;
  name: string;
  sort_index: number;
  updated_at: string;
}

export function useMyStudy(opts: { includeTrashed?: boolean } = {}) {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<StudyNotebook[]>([]);
  const [folders, setFolders] = useState<StudyFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Folders
    const { data: folderRows } = await supabase
      .from("notebook_folders" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("sort_index", { ascending: true });
    setFolders((folderRows || []) as any as StudyFolder[]);

    // Notebooks
    let q = supabase
      .from("session_notebooks" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (!opts.includeTrashed) q = q.is("deleted_at", null);
    const { data: rows } = await q;
    const list = (rows || []) as any[];

    // Split records by type for hydration.
    const liveIds = Array.from(
      new Set(
        list
          .filter((r) => (r.record_type || "live_session") === "live_session")
          .map((r) => r.record_id || r.session_id),
      ),
    ).filter(Boolean) as string[];
    const debateIds = Array.from(
      new Set(
        list
          .filter((r) => ["debate", "change_my_mind"].includes(r.record_type))
          .map((r) => r.record_id),
      ),
    ).filter(Boolean) as string[];

    const titles: Record<string, { title: string | null; created_at: string | null; ended_at: string | null }> = {};
    if (liveIds.length > 0) {
      const { data: sessions } = await supabase
        .from("live_sessions" as any)
        .select("id, title, created_at, ended_at")
        .in("id", liveIds);
      for (const s of (sessions || []) as any[]) {
        titles[s.id] = { title: s.title, created_at: s.created_at, ended_at: s.ended_at };
      }
    }
    if (debateIds.length > 0) {
      const { data: debates } = await supabase
        .from("debates" as any)
        .select("id, topic, created_at, ended_at")
        .in("id", debateIds);
      for (const d of (debates || []) as any[]) {
        titles[d.id] = { title: d.topic, created_at: d.created_at, ended_at: d.ended_at };
      }
    }

    // Annotation counts keyed by record_id (covers all formats).
    const allRecordIds = [...liveIds, ...debateIds];
    const annCounts: Record<string, number> = {};
    if (allRecordIds.length > 0) {
      const { data: anns } = await supabase
        .from("session_annotations" as any)
        .select("record_id")
        .eq("user_id", user.id)
        .in("record_id", allRecordIds);
      for (const a of (anns || []) as any[]) {
        annCounts[a.record_id] = (annCounts[a.record_id] || 0) + 1;
      }
    }

    // Tags via live_session_tags + tags (Live only — debate tags rendered elsewhere)
    const tagsBySession: Record<string, { id: string; name: string; slug: string }[]> = {};
    if (liveIds.length > 0) {
      const { data: lst } = await supabase
        .from("live_session_tags" as any)
        .select("live_session_id, tag_id")
        .in("live_session_id", liveIds);
      const tagIds = Array.from(new Set(((lst || []) as any[]).map((r) => r.tag_id)));
      const tagMap: Record<string, { id: string; name: string; slug: string }> = {};
      if (tagIds.length > 0) {
        const { data: tags } = await supabase
          .from("tags" as any)
          .select("id, name, slug")
          .in("id", tagIds);
        for (const t of (tags || []) as any[]) tagMap[t.id] = t;
      }
      for (const r of (lst || []) as any[]) {
        if (!tagsBySession[r.live_session_id]) tagsBySession[r.live_session_id] = [];
        const t = tagMap[r.tag_id];
        if (t) tagsBySession[r.live_session_id].push(t);
      }
    }

    const hydrated: StudyNotebook[] = list.map((r) => {
      const recordId = r.record_id || r.session_id;
      const meta = titles[recordId];
      return {
        ...(r as any),
        record_type: (r.record_type || "live_session") as RecordType,
        record_id: recordId,
        session_title: meta?.title ?? null,
        session_created_at: meta?.created_at ?? null,
        session_ended_at: meta?.ended_at ?? null,
        annotation_count: annCounts[recordId] || 0,
        tags: tagsBySession[recordId] || [],
      };
    });

    setNotebooks(hydrated);
    setLoading(false);
  }, [user, opts.includeTrashed]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ----- Folder mutations -----
  const createFolder = useCallback(
    async (name: string) => {
      if (!user) return null;
      const nextIdx = folders.length;
      const { data, error } = await supabase
        .from("notebook_folders" as any)
        .insert({ user_id: user.id, name, sort_index: nextIdx } as any)
        .select()
        .maybeSingle();
      if (!error && data) {
        setFolders((prev) => [...prev, data as any as StudyFolder]);
        return data as any as StudyFolder;
      }
      return null;
    },
    [user, folders.length],
  );

  const renameFolder = useCallback(async (id: string, name: string) => {
    await supabase.from("notebook_folders" as any).update({ name } as any).eq("id", id);
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    // Notebooks return to root via ON DELETE SET NULL.
    await supabase.from("notebook_folders" as any).delete().eq("id", id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setNotebooks((prev) => prev.map((n) => (n.folder_id === id ? { ...n, folder_id: null } : n)));
  }, []);

  const reorderFolders = useCallback(async (orderedIds: string[]) => {
    setFolders((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      return orderedIds.map((id, i) => ({ ...(map.get(id) as StudyFolder), sort_index: i }));
    });
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("notebook_folders" as any).update({ sort_index: i } as any).eq("id", id),
      ),
    );
  }, []);

  // ----- Notebook mutations -----
  const moveNotebookToFolder = useCallback(async (notebookId: string, folderId: string | null) => {
    setNotebooks((prev) => prev.map((n) => (n.id === notebookId ? { ...n, folder_id: folderId } : n)));
    await supabase
      .from("session_notebooks" as any)
      .update({ folder_id: folderId } as any)
      .eq("id", notebookId);
  }, []);

  const moveManyToFolder = useCallback(async (ids: string[], folderId: string | null) => {
    setNotebooks((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, folder_id: folderId } : n)));
    await supabase
      .from("session_notebooks" as any)
      .update({ folder_id: folderId } as any)
      .in("id", ids);
  }, []);

  const renameNotebook = useCallback(async (id: string, displayTitle: string) => {
    setNotebooks((prev) =>
      prev.map((n) => (n.id === id ? { ...n, display_title: displayTitle || null } : n)),
    );
    await supabase
      .from("session_notebooks" as any)
      .update({ display_title: displayTitle || null } as any)
      .eq("id", id);
  }, []);

  const softDelete = useCallback(async (ids: string[]) => {
    const stamp = new Date().toISOString();
    setNotebooks((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, deleted_at: stamp } : n)));
    await supabase
      .from("session_notebooks" as any)
      .update({ deleted_at: stamp } as any)
      .in("id", ids);
    await refresh();
  }, [refresh]);

  const restore = useCallback(async (ids: string[]) => {
    setNotebooks((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, deleted_at: null } : n)));
    await supabase
      .from("session_notebooks" as any)
      .update({ deleted_at: null } as any)
      .in("id", ids);
    await refresh();
  }, [refresh]);

  const hardDelete = useCallback(async (ids: string[]) => {
    setNotebooks((prev) => prev.filter((n) => !ids.includes(n.id)));
    await supabase.from("session_notebooks" as any).delete().in("id", ids);
  }, []);

  const reorderInFolder = useCallback(async (folderId: string | null, orderedIds: string[]) => {
    setNotebooks((prev) => {
      const indexMap = new Map(orderedIds.map((id, i) => [id, i] as const));
      return prev.map((n) =>
        n.folder_id === folderId && indexMap.has(n.id)
          ? { ...n, sort_index: indexMap.get(n.id)! }
          : n,
      );
    });
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("session_notebooks" as any).update({ sort_index: i } as any).eq("id", id),
      ),
    );
  }, []);

  const generateShareToken = useCallback(async (id: string) => {
    const existing = notebooks.find((n) => n.id === id);
    if (existing?.share_token) return existing.share_token;
    const token =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2)) + Date.now().toString(36);
    const { data, error } = await supabase
      .from("session_notebooks" as any)
      .update({ share_token: token } as any)
      .eq("id", id)
      .select("share_token")
      .maybeSingle();
    if (error || !data) return null;
    setNotebooks((prev) =>
      prev.map((n) => (n.id === id ? { ...n, share_token: (data as any).share_token } : n)),
    );
    return (data as any).share_token as string;
  }, [notebooks]);

  return {
    loading,
    notebooks,
    folders,
    refresh,
    createFolder,
    renameFolder,
    deleteFolder,
    reorderFolders,
    moveNotebookToFolder,
    moveManyToFolder,
    renameNotebook,
    softDelete,
    restore,
    hardDelete,
    reorderInFolder,
    generateShareToken,
  };
}

/** A notebook is "non-empty" if it has Thoughts text, a Take, or annotations. */
export function isNotebookNonEmpty(n: StudyNotebook) {
  const thoughtsText = (n.thoughts as any)?.blocks?.[0]?.value || "";
  return Boolean((thoughtsText && thoughtsText.trim()) || (n.my_take && n.my_take.trim()) || n.annotation_count > 0);
}

export function notebookPreview(n: StudyNotebook): string {
  const take = (n.my_take || "").trim();
  if (take) return take;
  const t = ((n.thoughts as any)?.blocks?.[0]?.value || "").trim();
  return t;
}

export function notebookTitle(n: StudyNotebook): string {
  return n.display_title?.trim() || n.session_title?.trim() || "Untitled session";
}