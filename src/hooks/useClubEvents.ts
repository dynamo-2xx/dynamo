import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClubEventItem {
  id: string;
  club_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_type: "debate" | "live" | "cmm";
  starts_at: string;
  ends_at: string | null;
  mode: "online" | "in_person" | "hybrid";
  venue: string | null;
  capacity: number | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  session_id: string | null;
  rsvp_count?: number;
  my_rsvp?: "going" | "maybe" | "declined" | null;
}

export function useClubEvents(clubId: string | undefined) {
  const { user } = useAuth();
  const [items, setItems] = useState<ClubEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data: events } = await supabase
      .from("club_events")
      .select("*")
      .eq("club_id", clubId)
      .order("starts_at", { ascending: true });
    if (!events) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ids = events.map((e) => e.id);
    const counts = new Map<string, number>();
    const mine = new Map<string, string>();
    if (ids.length) {
      const { data: rsvps } = await supabase
        .from("club_event_rsvps")
        .select("event_id, user_id, status")
        .in("event_id", ids);
      rsvps?.forEach((r) => {
        if (r.status === "going") counts.set(r.event_id, (counts.get(r.event_id) || 0) + 1);
        if (user && r.user_id === user.id) mine.set(r.event_id, r.status);
      });
    }
    setItems(
      events.map((e) => ({
        ...(e as any),
        rsvp_count: counts.get(e.id) || 0,
        my_rsvp: (mine.get(e.id) as any) || null,
      })),
    );
    setLoading(false);
  }, [clubId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}