import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Speaker-controlled per-turn pause, separate from the host's facilitator
 * pause. Persisted on `debates.speaker_paused_at` so refresh/rejoin survives,
 * and gated to "one per turn" via `speaker_pause_used_turn_key`.
 *
 * Auto-resume after 30s is computed server-trusted (`speaker_paused_at + 30s`),
 * not a setTimeout closure, so backgrounded tabs still resume reliably.
 */
const PAUSE_MAX_MS = 30_000;

interface State {
  speaker_paused_at: string | null;
  speaker_pause_owner_id: string | null;
  speaker_pause_used_turn_key: string | null;
}

export function useSpeakerPause(opts: {
  debateId: string | null | undefined;
  turnKey: string;
  /** Only the active speaker may pause; everyone observes. */
  canControl: boolean;
  ownerId: string | null | undefined;
}) {
  const { debateId, turnKey, canControl, ownerId } = opts;
  const [state, setState] = useState<State>({
    speaker_paused_at: null,
    speaker_pause_owner_id: null,
    speaker_pause_used_turn_key: null,
  });
  const [remainingMs, setRemainingMs] = useState(0);

  // Initial fetch + realtime sync
  useEffect(() => {
    if (!debateId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("debates")
        .select("speaker_paused_at, speaker_pause_owner_id, speaker_pause_used_turn_key")
        .eq("id", debateId)
        .maybeSingle();
      if (!cancelled && data) setState(data as any);
    })();
    const ch = supabase
      .channel(`speaker-pause-${debateId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "debates", filter: `id=eq.${debateId}` },
        (payload: any) => {
          const n = payload.new ?? {};
          setState({
            speaker_paused_at: n.speaker_paused_at ?? null,
            speaker_pause_owner_id: n.speaker_pause_owner_id ?? null,
            speaker_pause_used_turn_key: n.speaker_pause_used_turn_key ?? null,
          });
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [debateId]);

  const isPaused = !!state.speaker_paused_at;
  const usedThisTurn = state.speaker_pause_used_turn_key === turnKey;

  // Server-trusted countdown + auto-resume.
  useEffect(() => {
    if (!isPaused || !state.speaker_paused_at) {
      setRemainingMs(0);
      return;
    }
    const startedAt = new Date(state.speaker_paused_at).getTime();
    // Each client deterministically computes an auto-resume window. The pause
    // owner fires the RPC immediately at t=PAUSE_MAX_MS. Any other client acts
    // as a safety net after a small grace so the room never stalls if the
    // owner has disconnected. The RPC itself is idempotent.
    const isOwner = !!ownerId && state.speaker_pause_owner_id === ownerId;
    const triggerAt = isOwner ? PAUSE_MAX_MS : PAUSE_MAX_MS + 1_500;
    let fired = false;
    const tick = () => {
      const remaining = Math.max(0, PAUSE_MAX_MS - (Date.now() - startedAt));
      setRemainingMs(remaining);
      const elapsed = Date.now() - startedAt;
      if (!fired && elapsed >= triggerAt && debateId) {
        fired = true;
        void supabase.rpc("resume_speaker_pause" as any, { _debate_id: debateId });
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [isPaused, state.speaker_paused_at, state.speaker_pause_owner_id, debateId, ownerId]);

  const pause = useCallback(async () => {
    if (!debateId || !canControl) return;
    if (usedThisTurn) {
      toast.message("You've already used your pause this turn.");
      return;
    }
    if (isPaused) return;
    const { error } = await supabase
      .from("debates")
      .update({
        speaker_paused_at: new Date().toISOString(),
        speaker_pause_owner_id: ownerId ?? null,
        speaker_pause_used_turn_key: turnKey,
      } as any)
      .eq("id", debateId);
    if (error) toast.error(error.message);
  }, [debateId, canControl, usedThisTurn, isPaused, ownerId, turnKey]);

  const resume = useCallback(async () => {
    if (!debateId || !canControl) return;
    if (!isPaused) return;
    const { error } = await supabase.rpc("resume_speaker_pause" as any, { _debate_id: debateId });
    if (error) toast.error(error.message);
  }, [debateId, canControl, isPaused]);

  return {
    isPaused,
    usedThisTurn,
    remainingMs,
    pauseOwnerId: state.speaker_pause_owner_id,
    pause,
    resume,
  };
}