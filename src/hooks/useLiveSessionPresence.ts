import { useEffect, useState } from "react";
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

/**
 * Subscribes to live_session_participants for a session and (optionally) sends a
 * heartbeat for the local device every 15s.
 */
export function useLiveSessionPresence(
  sessionId: string | null,
  opts?: { deviceId?: string; heartbeat?: boolean },
) {
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);

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

    return () => {
      cancelled = true;
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
    const t = setInterval(beat, 15000);
    return () => clearInterval(t);
  }, [sessionId, opts?.heartbeat, opts?.deviceId]);

  return participants;
}
