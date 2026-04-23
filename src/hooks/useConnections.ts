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
  is_public?: boolean;
  follow_status?: "none" | "pending" | "following";
}

export interface IncomingFollowRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requester?: ConnectionUser | null;
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
    async (targetUserId: string): Promise<"following" | "requested" | false> => {
      if (!user) return false;
      const { data, error } = await (supabase as any).rpc("request_follow", { _target: targetUserId });
      if (error) {
        console.error(error);
        return false;
      }
      const status = (Array.isArray(data) ? data[0]?.status : (data as any)?.status) as
        | "following"
        | "requested"
        | undefined;
      return status ?? "following";
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

  const cancelRequest = useCallback(
    async (targetUserId: string) => {
      if (!user) return false;
      const { error } = await (supabase as any)
        .from("follow_requests")
        .delete()
        .eq("requester_id", user.id)
        .eq("target_id", targetUserId)
        .eq("status", "pending");
      return !error;
    },
    [user],
  );

  return { follow, unfollow, cancelRequest };
}

/** Outgoing follow requests I've made that are still pending (target ids) */
export function useMyPendingRequests() {
  const { user } = useAuth();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!user) {
      setPendingIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("follow_requests")
        .select("target_id")
        .eq("requester_id", user.id)
        .eq("status", "pending");
      if (!cancelled) setPendingIds(new Set((data || []).map((r: any) => r.target_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  return { pendingIds, refresh };
}

/** Incoming follow requests targeted at me (pending) */
export function useIncomingFollowRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<IncomingFollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: reqs } = await (supabase as any)
        .from("follow_requests")
        .select("id, requester_id, created_at")
        .eq("target_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const list = (reqs || []) as IncomingFollowRequest[];
      if (list.length === 0) {
        if (!cancelled) {
          setRequests([]);
          setLoading(false);
        }
        return;
      }
      const ids = list.map((r) => r.requester_id);
      const cards = await Promise.all(
        ids.map((id) => (supabase as any).rpc("get_profile_card", { _user_id: id })),
      );
      const map = new Map<string, ConnectionUser>();
      cards.forEach((res: any, i) => {
        const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
        if (row) map.set(ids[i], row as ConnectionUser);
      });
      if (!cancelled) {
        setRequests(list.map((r) => ({ ...r, requester: map.get(r.requester_id) ?? null })));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  // Realtime: refresh on any change to follow_requests targeting me
  useEffect(() => {
    if (!user) return;
    const channel = (supabase as any)
      .channel(`follow-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_requests", filter: `target_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [user, refresh]);

  const respond = useCallback(async (requestId: string, accept: boolean) => {
    const { error } = await (supabase as any).rpc("respond_follow_request", {
      _request_id: requestId,
      _accept: accept,
    });
    if (!error) refresh();
    return !error;
  }, [refresh]);

  return { requests, loading, refresh, respond };
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
