import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveParticipantPill {
  slot: number;
  name: string;
  userId: string | null;
  avatarUrl: string | null;
}

interface Options {
  sessionId: string;
  speakerNames: Record<string, string>;
  /** Owner of the session (created_by). Used as fallback identity for slot 0 in single-device. */
  createdBy?: string | null;
}

/**
 * Resolve participant identity for the post-session record pill row.
 * Pulls live_session_participants for multi-device sessions; for any
 * speaker_slot present in `speakerNames` without a matching row, returns
 * a plain (non-clickable) pill with the configured display name.
 */
export function useLiveParticipants({ sessionId, speakerNames, createdBy }: Options) {
  const [pills, setPills] = useState<LiveParticipantPill[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      // Map slot -> identity from live_session_participants
      const { data: parts } = await supabase
        .from("live_session_participants")
        .select("speaker_slot, user_id, display_name, avatar_url")
        .eq("session_id", sessionId);

      const bySlot = new Map<
        number,
        { user_id: string | null; display_name: string; avatar_url: string | null }
      >();
      (parts || []).forEach((p: any) => {
        // Last-write wins; multiple devices can share a slot, prefer one with user_id.
        const prev = bySlot.get(p.speaker_slot);
        if (!prev || (!prev.user_id && p.user_id)) {
          bySlot.set(p.speaker_slot, {
            user_id: p.user_id ?? null,
            display_name: p.display_name,
            avatar_url: p.avatar_url ?? null,
          });
        }
      });

      // Single-device sessions: no participants rows; treat created_by as slot 0 identity.
      let creatorProfile: { username: string | null; avatar_url: string | null } | null = null;
      const needsCreatorFallback =
        bySlot.size === 0 && !!createdBy && Object.keys(speakerNames).length > 0;
      if (needsCreatorFallback) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("avatar_url, display_name")
          .eq("user_id", createdBy!)
          .maybeSingle();
        creatorProfile = {
          username: prof?.display_name ?? null,
          avatar_url: prof?.avatar_url ?? null,
        };
      }

      // Build pill list ordered by slot number (numeric).
      const slots = Object.keys(speakerNames)
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);

      const out: LiveParticipantPill[] = slots.map((slot) => {
        const ident = bySlot.get(slot);
        const fallbackName = speakerNames[String(slot)] || `Speaker ${slot + 1}`;
        if (ident) {
          return {
            slot,
            name: ident.display_name || fallbackName,
            userId: ident.user_id,
            avatarUrl: ident.avatar_url,
          };
        }
        if (slot === 0 && creatorProfile) {
          return {
            slot,
            name: fallbackName,
            userId: createdBy ?? null,
            avatarUrl: creatorProfile.avatar_url,
          };
        }
        return { slot, name: fallbackName, userId: null, avatarUrl: null };
      });

      if (!cancelled) setPills(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, JSON.stringify(speakerNames), createdBy]);

  return pills;
}