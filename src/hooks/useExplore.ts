import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "./useTags";

export interface ExploreDebate {
  id: string;
  topic: string;
  status: string;
  cover_image_url: string | null;
  created_at: string;
  is_public: boolean;
  created_by: string;
  participant_count: number;
  argument_count?: number;
  community_tag?: string | null;
  tags?: Tag[];
  publisher_name?: string | null;
  publisher_avatar?: string | null;
}

export interface ExploreLiveSession {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  ended_at: string | null;
  share_token: string | null;
  tags?: Tag[];
}

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
});

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

export function useFeaturedDebates(limit = 4) {
  const [items, setItems] = useState<ExploreDebate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: live } = await supabase
        .from("debates")
        .select(DEBATE_SELECT)
        .eq("status", "live")
        .limit(limit);
      let pool = (live || []).map(mapDebate);
      if (pool.length < limit) {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: rest } = await supabase
          .from("debates")
          .select(DEBATE_SELECT)
          .neq("status", "live")
          .neq("status", "archived")
          .gte("created_at", since)
          .limit(limit * 2);
        const additions = (rest || [])
          .map(mapDebate)
          .sort((a, b) => b.participant_count - a.participant_count)
          .slice(0, limit - pool.length);
        pool = [...pool, ...additions];
      }
      if (!cancelled) {
        const enriched = await attachPublishers(pool.slice(0, limit));
        if (!cancelled) {
          setItems(enriched);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return { items, loading };
}

export function useTrendingDebates(limit = 6) {
  const [items, setItems] = useState<ExploreDebate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("debates")
        .select(DEBATE_SELECT)
        .neq("status", "archived")
        .gte("created_at", since)
        .limit(50);
      const mapped = (data || []).map(mapDebate).sort((a, b) => b.participant_count - a.participant_count);
      if (!cancelled) {
        const enriched = await attachPublishers(mapped.slice(0, limit));
        if (!cancelled) {
          setItems(enriched);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return { items, loading };
}

export function useLatestDebates(limit = 8) {
  const [items, setItems] = useState<ExploreDebate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("debates")
        .select(DEBATE_SELECT)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!cancelled) {
        const enriched = await attachPublishers((data || []).map(mapDebate));
        if (!cancelled) {
          setItems(enriched);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return { items, loading };
}

export function useDebatesByTag(tagId: string | null, limit = 50) {
  const [items, setItems] = useState<ExploreDebate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tagId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: links } = await (supabase as any)
        .from("debate_tags")
        .select("debate_id")
        .eq("tag_id", tagId)
        .limit(limit);
      const ids = (links || []).map((l: any) => l.debate_id);
      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("debates")
        .select(DEBATE_SELECT)
        .in("id", ids)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        const enriched = await attachPublishers((data || []).map(mapDebate));
        if (!cancelled) {
          setItems(enriched);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tagId, limit]);
  return { items, loading };
}

export function useLiveSessionsByTag(tagId: string | null, limit = 50) {
  const [items, setItems] = useState<ExploreLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tagId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: links } = await (supabase as any)
        .from("live_session_tags")
        .select("live_session_id")
        .eq("tag_id", tagId)
        .limit(limit);
      const ids = (links || []).map((l: any) => l.live_session_id);
      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await (supabase as any)
        .from("live_sessions")
        .select("id, title, status, created_at, ended_at, share_token")
        .in("id", ids)
        .not("share_token", "is", null)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setItems((data || []) as ExploreLiveSession[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tagId, limit]);
  return { items, loading };
}
