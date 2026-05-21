import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAllTags, type Tag } from "./useTags";
import type { ExploreDebate } from "./useExplore";

const DEBATE_SELECT =
  "id, topic, status, cover_image_url, created_at, is_public, created_by, community_tag, debate_participants(count)";

const mapDebate = (d: any): ExploreDebate => ({
  id: d.id,
  topic: d.topic,
  status: d.status,
  cover_image_url: d.cover_image_url,
  created_at: d.created_at,
  is_public: d.is_public,
  created_by: d.created_by,
  community_tag: d.community_tag,
  participant_count: d.debate_participants?.[0]?.count ?? 0,
  kind: "debate",
});

const mapImported = (r: any): ExploreDebate => ({
  id: r.id,
  topic: r.title || "Imported record",
  status: "completed",
  cover_image_url: r.cover_image_url,
  created_at: r.created_at,
  is_public: !!r.is_public,
  created_by: r.user_id,
  participant_count: 0,
  kind: "imported_record",
});

export interface Shelf {
  tag: Tag;
  items: ExploreDebate[];
}

async function attachPublishers(items: ExploreDebate[]): Promise<ExploreDebate[]> {
  const ids = Array.from(new Set(items.map((i) => i.created_by).filter(Boolean)));
  if (ids.length === 0) return items;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", ids);
  const map = new Map<string, { name: string | null; avatar: string | null }>();
  (data || []).forEach((p: any) =>
    map.set(p.user_id, { name: p.display_name, avatar: p.avatar_url }),
  );
  return items.map((i) => ({
    ...i,
    publisher_name: map.get(i.created_by)?.name ?? null,
    publisher_avatar: map.get(i.created_by)?.avatar ?? null,
  }));
}

async function fetchTagShelf(tag: Tag, perTag = 12): Promise<ExploreDebate[]> {
  // debate ids tagged with this tag
  const { data: dLinks } = await (supabase as any)
    .from("debate_tags")
    .select("debate_id")
    .eq("tag_id", tag.id)
    .limit(perTag * 2);
  const debateIds = (dLinks || []).map((l: any) => l.debate_id);

  let debates: ExploreDebate[] = [];
  if (debateIds.length) {
    const { data } = await supabase
      .from("debates")
      .select(DEBATE_SELECT)
      .in("id", debateIds)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(perTag);
    debates = (data || []).map(mapDebate);
  }

  // imported records linked via record_tags (if table exists) — otherwise skip
  let imported: ExploreDebate[] = [];
  try {
    const { data: iLinks } = await (supabase as any)
      .from("imported_record_tags")
      .select("record_id")
      .eq("tag_id", tag.id)
      .limit(perTag);
    const ids = (iLinks || []).map((l: any) => l.record_id);
    if (ids.length) {
      const { data } = await (supabase as any)
        .from("imported_records")
        .select("id, title, cover_image_url, created_at, user_id, is_public")
        .in("id", ids)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      imported = ((data as any[]) || []).map(mapImported);
    }
  } catch {
    // table may not exist; ignore
  }

  const merged = [...debates, ...imported]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, perTag);

  return attachPublishers(merged);
}

export function useTagShelves(maxTags = 16) {
  const { tags } = useAllTags();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const visible = tags
      .filter((t) => t.is_official || t.debate_count > 0)
      .slice(0, maxTags);
    if (visible.length === 0) {
      setShelves([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const results = await Promise.all(
        visible.map(async (tag) => ({ tag, items: await fetchTagShelf(tag) })),
      );
      if (!cancelled) {
        setShelves(results.filter((s) => s.items.length > 0));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tags, maxTags]);

  return { shelves, loading };
}