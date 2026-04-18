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
        .eq("is_public", true)
        .eq("status", "live")
        .limit(limit);
      let pool = (live || []).map(mapDebate);
      if (pool.length < limit) {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: rest } = await supabase
          .from("debates")
          .select(DEBATE_SELECT)
          .eq("is_public", true)
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
        setItems(pool.slice(0, limit));
        setLoading(false);
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
        .eq("is_public", true)
        .neq("status", "archived")
        .gte("created_at", since)
        .limit(50);
      const mapped = (data || []).map(mapDebate).sort((a, b) => b.participant_count - a.participant_count);
      if (!cancelled) {
        setItems(mapped.slice(0, limit));
        setLoading(false);
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
        .eq("is_public", true)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!cancelled) {
        setItems((data || []).map(mapDebate));
        setLoading(false);
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
        .eq("is_public", true)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setItems((data || []).map(mapDebate));
        setLoading(false);
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
