import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConnectionUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  affiliation: string | null;
  location?: string | null;
}

export interface Recommendation extends ConnectionUser {
  shared_tags: string[] | null;
  same_location: boolean;
  mutual_count: number;
  score: number;
}

/** Users I follow */
export function useFollowing() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!user) {
      setUsers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: edges } = await (supabase as any)
        .from("connections")
        .select("followed_id")
        .eq("follower_id", user.id);
      const ids = (edges || []).map((e: any) => e.followed_id);
      if (ids.length === 0) {
        if (!cancelled) {
          setUsers([]);
          setLoading(false);
        }
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, affiliation, location")
        .in("user_id", ids);
      if (!cancelled) {
        setUsers((profiles || []) as ConnectionUser[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  return { users, loading, refresh };
}

/** Recommended users via RPC */
export function useRecommendedUsers(limit = 10) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUsers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_recommended_users", { _limit: limit });
      if (error) console.error(error);
      if (!cancelled) {
        setUsers((data || []) as Recommendation[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, limit]);

  return { users, loading };
}

export function useFollowMutations() {
  const { user } = useAuth();

  const follow = useCallback(
    async (targetUserId: string) => {
      if (!user) return false;
      const { error } = await (supabase as any)
        .from("connections")
        .insert({ follower_id: user.id, followed_id: targetUserId });
      return !error;
    },
    [user],
  );

  const unfollow = useCallback(
    async (targetUserId: string) => {
      if (!user) return false;
      const { error } = await (supabase as any)
        .from("connections")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", targetUserId);
      return !error;
    },
    [user],
  );

  return { follow, unfollow };
}

/** Online friends count + list (visible per privacy rules) */
export function useFriendsOnline() {
  const { user } = useAuth();
  const { users: following } = useFollowing();
  const [online, setOnline] = useState<ConnectionUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || following.length === 0) {
      setOnline([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const ids = following.map((u) => u.user_id);
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("user_presence")
        .select("user_id, last_seen_at")
        .in("user_id", ids)
        .gte("last_seen_at", since);
      const onlineIds = new Set((data || []).map((r: any) => r.user_id));
      if (!cancelled) {
        setOnline(following.filter((u) => onlineIds.has(u.user_id)));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, following]);

  return { online, loading, totalFollowing: following.length };
}
