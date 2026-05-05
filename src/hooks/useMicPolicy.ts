import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SessionKind } from "./useMicLobby";

interface Args {
  kind: SessionKind;
  sessionId: string | null;
  /** This client's user id (for matching turn ownership). */
  userId: string | null;
  /** True if this user is the session owner. */
  isOwner: boolean;
  /** Live MediaStream — we flip its audio tracks per policy. */
  stream?: MediaStream | null;
}

export interface MicPolicy {
  canSpeak: boolean;
  locked: boolean;
  lockReason: string | null;
}

/**
 * Computes whether *this device's* mic should be open right now and enforces
 * the rule on the underlying audio tracks.
 *
 * - Debate: only the speaker on `current_speaker_side_id` whose participant
 *           is this user may speak.
 * - CMM:    owner is always live during a round; the active queue user is live.
 * - Live:   open by default; if echo_guard is on, voice-detect-only joiners
 *           are muted.
 */
export function useMicPolicy({ kind, sessionId, userId, isOwner, stream }: Args): MicPolicy {
  const [policy, setPolicy] = useState<MicPolicy>({
    canSpeak: false,
    locked: true,
    lockReason: "Connecting…",
  });

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const recompute = async () => {
      let next: MicPolicy = { canSpeak: false, locked: true, lockReason: "Connecting…" };

      if (kind === "debate") {
        const { data: d } = await supabase
          .from("debates")
          .select("status, current_speaker_side_id, started_at")
          .eq("id", sessionId)
          .maybeSingle();
        if (!d || d.status !== "live") {
          next = { canSpeak: false, locked: true, lockReason: "Waiting for debate to start" };
        } else if (!d.current_speaker_side_id) {
          next = { canSpeak: false, locked: true, lockReason: "Waiting for next turn" };
        } else {
          const { data: me } = await supabase
            .from("debate_participants")
            .select("side_id, participant_role")
            .eq("debate_id", sessionId)
            .eq("user_id", userId ?? "")
            .maybeSingle();
          const onTurn =
            !!me &&
            me.participant_role === "speaker" &&
            me.side_id === d.current_speaker_side_id;
          next = onTurn
            ? { canSpeak: true, locked: false, lockReason: null }
            : { canSpeak: false, locked: true, lockReason: "Wait for your turn" };
        }
      } else if (kind === "cmm") {
        const { data: d } = await supabase
          .from("debates")
          .select("created_by, status")
          .eq("id", sessionId)
          .maybeSingle();
        if (!d || d.status !== "live") {
          next = { canSpeak: false, locked: true, lockReason: "Waiting for round to start" };
        } else {
          const { data: active } = await (supabase as any)
            .from("cmm_queue")
            .select("user_id")
            .eq("debate_id", sessionId)
            .eq("status", "active")
            .maybeSingle();
          if (isOwner && active?.user_id) {
            next = { canSpeak: true, locked: false, lockReason: null };
          } else if (active?.user_id && active.user_id === userId) {
            next = { canSpeak: true, locked: false, lockReason: null };
          } else {
            next = { canSpeak: false, locked: true, lockReason: "Only host + active challenger can speak" };
          }
        }
      } else {
        // live — open by default; echo_guard mutes voice-detect-only joiners
        const { data: s } = await (supabase as any)
          .from("live_sessions")
          .select("echo_guard, status")
          .eq("id", sessionId)
          .maybeSingle();
        if (!s || s.status !== "recording") {
          next = { canSpeak: false, locked: true, lockReason: "Waiting for host to start" };
        } else if (s.echo_guard && !isOwner) {
          // check our own mic_connections row to see if we're voice-detect-only
          const { data: row } = await (supabase as any)
            .from("mic_connections")
            .select("mode")
            .eq("session_kind", "live")
            .eq("session_id", sessionId)
            .eq("user_id", userId ?? "")
            .eq("status", "connected")
            .maybeSingle();
          if (row?.mode === "voice_detect_only") {
            next = { canSpeak: false, locked: true, lockReason: "Echo guard on — using room mic" };
          } else {
            next = { canSpeak: true, locked: false, lockReason: null };
          }
        } else {
          next = { canSpeak: true, locked: false, lockReason: null };
        }
      }

      if (!cancelled) setPolicy(next);
    };

    recompute();

    // Realtime triggers per kind
    const channels: any[] = [];
    const ch = supabase
      .channel(`mic-policy-${kind}-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: kind === "live" ? "live_sessions" : "debates", filter: `id=eq.${sessionId}` },
        () => recompute(),
      );
    if (kind === "cmm") {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cmm_queue", filter: `debate_id=eq.${sessionId}` },
        () => recompute(),
      );
    }
    if (kind === "live") {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mic_connections", filter: `session_id=eq.${sessionId}` },
        () => recompute(),
      );
    }
    ch.subscribe();
    channels.push(ch);

    return () => {
      cancelled = true;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [kind, sessionId, userId, isOwner]);

  // Drive the audio tracks
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = policy.canSpeak;
    });
  }, [stream, policy.canSpeak]);

  return policy;
}