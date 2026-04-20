import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveParticipant {
  session_id: string;
  device_id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  speaker_slot: number;
  joined_at: string;
  last_seen_at: string;
}

const STALE_MS = 8_000;
const HEARTBEAT_MS = 3_000;

/**
 * Subscribes to live_session_participants and (optionally) sends a 5s heartbeat.
 * Filters out rows whose last_seen_at is older than 15s so phantom speakers
 * never appear in the UI even if the row hasn't been purged yet.
 */
export function useLiveSessionPresence(
  sessionId: string | null,
  opts?: { deviceId?: string; heartbeat?: boolean },
) {
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("live_session_participants")
        .select("*")
        .eq("session_id", sessionId)
        .order("speaker_slot", { ascending: true });
      if (!cancelled && data) setParticipants(data as LiveParticipant[]);
    };
    load();

    const channel = supabase
      .channel(`live-presence-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_session_participants", filter: `session_id=eq.${sessionId}` },
        () => load(),
      )
      .subscribe();

    // Re-evaluate stale filter every 5s so disappearances don't lag.
    const tick = setInterval(() => setTick((n) => n + 1), 5000);

    return () => {
      cancelled = true;
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !opts?.heartbeat || !opts?.deviceId) return;
    const beat = () => {
      (supabase as any).rpc("live_session_heartbeat", {
        _session_id: sessionId,
        _device_id: opts.deviceId,
      });
    };
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [sessionId, opts?.heartbeat, opts?.deviceId]);

  // Filter stale rows on the client (defensive)
  const live = useMemo(() => {
    const cutoff = Date.now() - STALE_MS;
    return participants.filter((p) => {
      // Always trust the local device row; otherwise apply staleness filter.
      if (opts?.deviceId && p.device_id === opts.deviceId) return true;
      const seen = new Date(p.last_seen_at).getTime();
      return seen >= cutoff;
    });
  }, [participants, opts?.deviceId]);

  return live;
}
