import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SessionKind = "debate" | "live" | "cmm";
export type MicMode = "own_mic" | "voice_detect_only";
export type MicStatus = "connected" | "released" | "left";

export interface MicConnection {
  id: string;
  session_kind: SessionKind;
  session_id: string;
  slot_key: string;
  user_id: string | null;
  device_id: string | null;
  display_name: string;
  avatar_url: string | null;
  mode: MicMode;
  status: MicStatus;
  last_audio_rms: number;
  last_seen_at: string;
  voice_confirmed_at: string | null;
  created_at: string;
}

/**
 * Owner-side hook: live list of all mic_connections for a session,
 * subscribed via Supabase Realtime.
 */
export function useMicLobby(kind: SessionKind, sessionId: string | null) {
  const [rows, setRows] = useState<MicConnection[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("mic_connections")
        .select("*")
        .eq("session_kind", kind)
        .eq("session_id", sessionId)
        .eq("status", "connected")
        .order("created_at", { ascending: true });
      if (!cancelled) setRows((data ?? []) as MicConnection[]);
    };
    load();

    const channel = supabase
      .channel(`mic-lobby-${kind}-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mic_connections",
          filter: `session_id=eq.${sessionId}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [kind, sessionId]);

  const release = async (id: string) => {
    await (supabase as any)
      .from("mic_connections")
      .update({ status: "released" })
      .eq("id", id);
  };

  return { rows, release };
}

export const useMicPresence = useMicLobby;