import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SessionKind, MicMode } from "./useMicLobby";

interface Args {
  kind: SessionKind;
  sessionId: string | null;
  slotKey: string | null;
  userId: string | null;
  deviceId: string;
  displayName: string;
  avatarUrl?: string | null;
  mode: MicMode;
  /** Live mic stream (only when mode === 'own_mic'). */
  stream?: MediaStream | null;
  releaseOnUnmount?: boolean;
}

/**
 * Joiner-side hook: writes/maintains the mic_connections row for this
 * device, broadcasts a periodic RMS heartbeat for the owner's lobby meter,
 * and releases on unmount.
 */
export function useMicLobbyAttachment({
  kind,
  sessionId,
  slotKey,
  userId,
  deviceId,
  displayName,
  avatarUrl,
  mode,
  stream,
  releaseOnUnmount = true,
}: Args) {
  const rowIdRef = useRef<string | null>(null);
  const rmsRef = useRef<number>(0);

  // Insert / upsert our row
  useEffect(() => {
    if (!sessionId || !slotKey || !userId) return;
    let cancelled = false;

    (async () => {
      // Try to take this slot. If it's already taken by us (same device), update.
      const { data: existing } = await (supabase as any)
        .from("mic_connections")
        .select("id")
        .eq("session_kind", kind)
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .eq("status", "connected")
        .maybeSingle();

      if (existing?.id) {
        rowIdRef.current = existing.id;
        await (supabase as any)
          .from("mic_connections")
          .update({
            slot_key: slotKey,
            device_id: deviceId,
            display_name: displayName,
            avatar_url: avatarUrl ?? null,
            mode,
            status: "connected",
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        const { data: inserted } = await (supabase as any)
          .from("mic_connections")
          .insert({
            session_kind: kind,
            session_id: sessionId,
            slot_key: slotKey,
            user_id: userId,
            device_id: deviceId,
            display_name: displayName,
            avatar_url: avatarUrl ?? null,
            mode,
          })
          .select("id")
          .maybeSingle();
        if (inserted?.id) rowIdRef.current = inserted.id;
      }

      if (cancelled && rowIdRef.current) {
        if (!releaseOnUnmount) return;
        await (supabase as any)
          .from("mic_connections")
          .update({ status: "released" })
          .eq("id", rowIdRef.current);
      }
    })();

    return () => {
      cancelled = true;
      const id = rowIdRef.current;
      if (id && releaseOnUnmount) {
        (supabase as any)
          .from("mic_connections")
          .update({ status: "released" })
          .eq("id", id);
      }
      rowIdRef.current = null;
    };
  }, [kind, sessionId, slotKey, userId, deviceId, displayName, avatarUrl, mode, releaseOnUnmount]);

  // Audio analyser + RMS heartbeat (every 2s) — only when we have a stream
  useEffect(() => {
    if (!stream || mode !== "own_mic") return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      rmsRef.current = Math.min(1, Math.sqrt(sumSq / data.length) * 4);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const beat = window.setInterval(() => {
      const id = rowIdRef.current;
      if (!id) return;
      (supabase as any)
        .from("mic_connections")
        .update({
          last_audio_rms: rmsRef.current,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", id);
    }, 2000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(beat);
      ctx.close().catch(() => undefined);
    };
  }, [stream, mode]);
}