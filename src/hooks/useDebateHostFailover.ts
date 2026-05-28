import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wave 6 §2 — Host failover.
 *
 * Behaviour:
 * - If the current user IS the active host, beat the heartbeat every 20s
 *   so other clients know the host is alive.
 * - If the current user is NOT the active host, poll every 15s to check the
 *   host's heartbeat. If it is stale (>60s) AND the current user is allowed
 *   to take over (speaker / facilitator / creator), expose `canClaim=true`.
 * - `claim()` calls the `claim_debate_host` RPC.
 */
export function useDebateHostFailover(opts: {
  debateId: string | undefined;
  userId: string | undefined;
  status: string | undefined;
  isParticipant: boolean;
}) {
  const { debateId, userId, status, isParticipant } = opts;
  const [activeHostUserId, setActiveHostUserId] = useState<string | null>(null);
  const [heartbeatAt, setHeartbeatAt] = useState<string | null>(null);
  const [canClaim, setCanClaim] = useState(false);

  // Beat heartbeat when I'm the active host and the room is live/draft.
  useEffect(() => {
    if (!debateId || !userId) return;
    if (status === "completed" || status === "archived") return;
    if (activeHostUserId !== userId) return;

    let cancelled = false;
    const beat = async () => {
      if (cancelled) return;
      await supabase.rpc("debate_host_heartbeat" as any, { _debate_id: debateId });
    };
    void beat();
    const t = setInterval(beat, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [debateId, userId, status, activeHostUserId]);

  // Poll debate row for host status; cheap query, only the two columns.
  useEffect(() => {
    if (!debateId) return;
    if (status === "completed" || status === "archived") return;
    let cancelled = false;
    const poll = async () => {
      const { data } = await supabase
        .from("debates")
        .select("active_host_user_id, active_host_heartbeat_at")
        .eq("id", debateId)
        .maybeSingle();
      if (cancelled || !data) return;
      setActiveHostUserId((data as any).active_host_user_id ?? null);
      setHeartbeatAt((data as any).active_host_heartbeat_at ?? null);
    };
    void poll();
    const t = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [debateId, status]);

  // Compute claim-eligibility.
  useEffect(() => {
    if (!userId || !activeHostUserId || activeHostUserId === userId) {
      setCanClaim(false);
      return;
    }
    if (!isParticipant) {
      setCanClaim(false);
      return;
    }
    const ts = heartbeatAt ? new Date(heartbeatAt).getTime() : 0;
    const stale = !ts || Date.now() - ts > 60_000;
    setCanClaim(stale);
  }, [userId, activeHostUserId, heartbeatAt, isParticipant]);

  const claim = useCallback(async () => {
    if (!debateId) return false;
    const { data, error } = await supabase.rpc("claim_debate_host" as any, {
      _debate_id: debateId,
    });
    if (error) return false;
    return Boolean(data);
  }, [debateId]);

  return { activeHostUserId, heartbeatAt, canClaim, claim };
}