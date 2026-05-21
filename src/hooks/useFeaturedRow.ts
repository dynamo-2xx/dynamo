import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ExploreDebate } from "./useExplore";

export type FeaturedScope = "for_you" | "local";

const STORAGE_KEY = "explore.featuredScope";

interface RawRow {
  id: string;
  kind: "debate" | "imported_record";
  topic: string;
  cover_image_url: string | null;
  status: string;
  created_at: string;
  created_by: string;
  participant_count: number;
  comment_count: number;
  score: number;
}

async function attachPublishers(items: ExploreDebate[]): Promise<ExploreDebate[]> {
  const ids = Array.from(new Set(items.map((i) => i.created_by).filter(Boolean)));
  if (!ids.length) return items;
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

async function fetchScope(
  scope: FeaturedScope,
  viewer: string | null,
  limit: number,
): Promise<ExploreDebate[]> {
  const { data, error } = await (supabase as any).rpc("featured_records", {
    p_scope: scope,
    p_viewer: viewer,
    p_limit: limit,
  });
  if (error || !data) return [];
  const mapped: ExploreDebate[] = (data as RawRow[]).map((r) => ({
    id: r.id,
    topic: r.topic,
    status: r.status,
    cover_image_url: r.cover_image_url,
    created_at: r.created_at,
    is_public: true,
    created_by: r.created_by,
    participant_count: r.participant_count ?? 0,
    kind: r.kind,
  }));
  return attachPublishers(mapped);
}

export function useFeaturedRow(limit = 12) {
  const { user } = useAuth();
  const viewer = user?.id ?? null;

  const [canUseLocal, setCanUseLocal] = useState(false);
  const [scope, setScopeState] = useState<FeaturedScope>("for_you");
  const [items, setItems] = useState<ExploreDebate[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Determine if viewer has a location → eligible for Local
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!viewer) {
        if (!cancelled) setCanUseLocal(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("location")
        .eq("user_id", viewer)
        .maybeSingle();
      const has = !!(data?.location && data.location.trim());
      if (!cancelled) setCanUseLocal(has);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  // Pick initial scope once we know eligibility
  useEffect(() => {
    if (bootstrapped) return;
    let initial: FeaturedScope = "for_you";
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as FeaturedScope | null;
      if (stored === "local" || stored === "for_you") initial = stored;
      else if (canUseLocal) initial = "local";
    } catch {
      if (canUseLocal) initial = "local";
    }
    if (initial === "local" && !canUseLocal) initial = "for_you";
    setScopeState(initial);
    setBootstrapped(true);
  }, [canUseLocal, bootstrapped]);

  // Fetch when scope or viewer changes
  useEffect(() => {
    if (!bootstrapped) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      let rows = await fetchScope(scope, viewer, limit);
      // Local fallback: if user picked Local but nothing returns, also fetch for_you as backup
      if (scope === "local" && rows.length < 3) {
        const extra = await fetchScope("for_you", viewer, limit);
        const seen = new Set(rows.map((r) => r.id));
        rows = [...rows, ...extra.filter((r) => !seen.has(r.id))].slice(0, limit);
      }
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, viewer, limit, bootstrapped]);

  const setScope = useCallback((s: FeaturedScope) => {
    setScopeState(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* ignore */
    }
  }, []);

  return { items, loading, scope, setScope, canUseLocal };
}