import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * §21 Performance Intelligence — LIVE pass dispatcher.
 *
 * Watches the merged transcript and, while `active` is true (i.e. the user
 * is the on-mic speaker for this turn / session), fires the analyzer on each
 * newly-finalized entry of theirs.
 *
 * - Dedupes via a ref so an entry is never analyzed twice.
 * - Only runs LIVE-tag-set passages (analyze-performance handles the
 *   premium/founder gate and writes one annotation per detected tag).
 * - One passage per call so the AI focuses on a single argument unit.
 */
type Entry = { id: string; text: string; is_final?: boolean; subtopic?: string };

export function useLivePerfStreamer(opts: {
  sessionId: string | null | undefined;
  sessionKind: "debate" | "cmm" | "live";
  participantId: string | null | undefined;
  entries: Entry[];
  /** Only dispatch when true (e.g. it's this user's mic turn). */
  active: boolean;
}) {
  const { sessionId, sessionKind, participantId, entries, active } = opts;
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!active || !sessionId || !participantId) return;
    for (const e of entries) {
      if (!e?.id || !e.text || e.text.trim().length < 30) continue;
      if (e.is_final === false) continue;
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      const passage = {
        transcript_entry_id: e.id,
        text: e.text.slice(0, 2000),
        subtopic_id: null as string | null,
      };
      supabase.functions
        .invoke("analyze-performance", {
          body: {
            session_id: sessionId,
            session_kind: sessionKind,
            participant_id: participantId,
            pass: "live",
            passages: [passage],
          },
        })
        .catch(() => {
          // Allow retry on next render if the call failed.
          seen.current.delete(e.id);
        });
    }
  }, [entries, active, sessionId, sessionKind, participantId]);
}