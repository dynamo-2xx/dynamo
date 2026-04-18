import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Tag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_tag_id: string | null;
  is_official: boolean;
  debate_count: number;
  created_by: string | null;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

/** Search and read tags */
export function useAllTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("tags")
        .select("*")
        .order("is_official", { ascending: false })
        .order("debate_count", { ascending: false })
        .order("name");
      if (!cancelled) {
        setTags((data || []) as Tag[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { tags, loading, refresh };
}

/** Tags attached to a specific debate or live session */
export function useRecordTags(kind: "debate" | "live_session", recordId: string | null | undefined) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!recordId) {
      setTags([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const table = kind === "debate" ? "debate_tags" : "live_session_tags";
      const fk = kind === "debate" ? "debate_id" : "live_session_id";
      const { data } = await (supabase as any)
        .from(table)
        .select("tag:tags(*)")
        .eq(fk, recordId);
      if (!cancelled) {
        setTags(((data || []).map((r: any) => r.tag).filter(Boolean)) as Tag[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, recordId, version]);

  return { tags, loading, refresh };
}

/** Mutations for record tags */
export function useTagMutations() {
  const { user } = useAuth();

  const findOrCreateTag = useCallback(
    async (name: string): Promise<Tag | null> => {
      const slug = slugify(name);
      if (!slug) return null;

      const { data: existing } = await (supabase as any)
        .from("tags")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (existing) return existing as Tag;

      if (!user) return null;
      const { data: created, error } = await (supabase as any)
        .from("tags")
        .insert({
          slug,
          name: name.trim(),
          created_by: user.id,
          is_official: false,
        })
        .select("*")
        .single();
      if (error) {
        console.error("create tag", error);
        return null;
      }
      return created as Tag;
    },
    [user],
  );

  const attachTag = useCallback(
    async (kind: "debate" | "live_session", recordId: string, tagId: string) => {
      const table = kind === "debate" ? "debate_tags" : "live_session_tags";
      const fk = kind === "debate" ? "debate_id" : "live_session_id";
      const { error } = await (supabase as any).from(table).insert({ [fk]: recordId, tag_id: tagId });
      return !error;
    },
    [],
  );

  const detachTag = useCallback(
    async (kind: "debate" | "live_session", recordId: string, tagId: string) => {
      const table = kind === "debate" ? "debate_tags" : "live_session_tags";
      const fk = kind === "debate" ? "debate_id" : "live_session_id";
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq(fk, recordId)
        .eq("tag_id", tagId);
      return !error;
    },
    [],
  );

  return { findOrCreateTag, attachTag, detachTag };
}
