import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClubItem {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  location: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  is_featured?: boolean;
  requires_approval?: boolean;
}

export function useClubs() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClubItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: clubs } = await supabase
      .from("clubs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!clubs) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ids = clubs.map((c) => c.id);
    const counts = new Map<string, number>();
    const myMemberships = new Set<string>();
    if (ids.length) {
      const { data: members } = await supabase
        .from("club_members")
        .select("club_id, user_id")
        .in("club_id", ids);
      members?.forEach((m) => {
        counts.set(m.club_id, (counts.get(m.club_id) || 0) + 1);
        if (user && m.user_id === user.id) myMemberships.add(m.club_id);
      });
    }
    setItems(
      clubs.map((c) => ({
        ...c,
        member_count: counts.get(c.id) || 0,
        is_member: myMemberships.has(c.id),
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

export function useClub(clubId: string | undefined) {
  const { user } = useAuth();
  const [club, setClub] = useState<ClubItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<"owner" | "admin" | "member" | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [pendingRequest, setPendingRequest] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await supabase.from("clubs").select("*").eq("id", clubId).maybeSingle();
    setClub(data as any);
    const { data: members } = await supabase
      .from("club_members")
      .select("user_id, role")
      .eq("club_id", clubId);
    setMemberCount(members?.length || 0);
    if (user && members) {
      const m = members.find((x) => x.user_id === user.id);
      setMyRole((m?.role as any) || null);
    } else {
      setMyRole(null);
    }
    if (user) {
      const { data: req } = await supabase
        .from("club_join_requests")
        .select("status")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      setPendingRequest(!!req);
    }
    setLoading(false);
  }, [clubId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { club, loading, myRole, memberCount, pendingRequest, refresh };
}