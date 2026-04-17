import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DebateCoverItem } from "@/components/home/DebateCoverCard";

type Mode = "trending" | "local";

export function useForYouDebates(mode: Mode, limit = 12) {
  const { profile } = useAuth();
  const [items, setItems] = useState<DebateCoverItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("debates")
        .select("id, topic, status, cover_image_url, created_at, location, debate_participants(count)")
        .eq("is_public", true);

      if (mode === "local" && profile?.location) {
        query = query.eq("location", profile.location);
      }

      const { data } = await query.limit(50);
      if (cancelled) return;

      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        topic: d.topic,
        status: d.status,
        cover_image_url: d.cover_image_url,
        created_at: d.created_at,
        participant_count: d.debate_participants?.[0]?.count ?? 0,
      })) as DebateCoverItem[];

      // Live first, then by participant count desc
      mapped.sort((a, b) => {
        if (a.status === "live" && b.status !== "live") return -1;
        if (b.status === "live" && a.status !== "live") return 1;
        return (b.participant_count || 0) - (a.participant_count || 0);
      });

      setItems(mapped.slice(0, limit));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mode, profile?.location, limit]);

  return { items, loading };
}

export function useMyRecentDebates(limit = 12) {
  const { user } = useAuth();
  const [items, setItems] = useState<DebateCoverItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      // Debates I created
      const { data: created } = await supabase
        .from("debates")
        .select("id, topic, status, cover_image_url, created_at, updated_at, debate_participants(count)")
        .eq("created_by", user.id)
        .order("updated_at", { ascending: false })
        .limit(limit);

      // Debates I joined as a participant
      const { data: parts } = await supabase
        .from("debate_participants")
        .select("debate_id, debates(id, topic, status, cover_image_url, created_at, updated_at, debate_participants(count))")
        .eq("user_id", user.id)
        .limit(limit);

      if (cancelled) return;

      const map = new Map<string, DebateCoverItem>();
      for (const d of created || []) {
        map.set(d.id, {
          id: d.id,
          topic: d.topic,
          status: d.status,
          cover_image_url: d.cover_image_url,
          created_at: (d as any).updated_at || d.created_at,
          participant_count: (d as any).debate_participants?.[0]?.count ?? 0,
        });
      }
      for (const row of parts || []) {
        const d: any = (row as any).debates;
        if (!d || map.has(d.id)) continue;
        map.set(d.id, {
          id: d.id,
          topic: d.topic,
          status: d.status,
          cover_image_url: d.cover_image_url,
          created_at: d.updated_at || d.created_at,
          participant_count: d.debate_participants?.[0]?.count ?? 0,
        });
      }
      const all = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
      setItems(all.slice(0, limit));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, limit]);

  return { items, loading };
}
