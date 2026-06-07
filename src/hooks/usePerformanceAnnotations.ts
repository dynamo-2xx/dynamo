import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PerfAnnotation = {
  id: string;
  session_id: string;
  session_kind: "debate" | "cmm" | "live" | "imported";
  participant_id: string | null;
  subtopic_id: string | null;
  transcript_entry_id: string | null;
  // New polarity-tag fields (v2):
  tag_label: string | null;
  polarity: "positive" | "negative" | null;
  span_text: string | null;
  cited_entry_ids: string[] | null;
  // Legacy fields (kept for back-compat read paths):
  attribute_group: string | null;
  sub_attribute: string | null;
  severity: "green" | "orange" | "red" | null;
  pass_kind: "live" | "deep";
  explanation: string;
  recommendation: string | null;
  created_at: string;
};

/**
 * Fetch + realtime-subscribe to performance annotations for a session.
 * Returns rows ordered newest-first.
 */
export function usePerformanceAnnotations(
  sessionId: string | null | undefined,
  sessionKind: "debate" | "cmm" | "live" | "imported",
  participantId?: string | null,
) {
  const [data, setData] = useState<PerfAnnotation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const fetchAll = async () => {
      let q = supabase
        .from("performance_annotations")
        .select("*")
        .eq("session_id", sessionId)
        .eq("session_kind", sessionKind)
        .order("created_at", { ascending: false });
      if (participantId) q = q.eq("participant_id", participantId);
      const { data } = await q;
      if (!cancelled) {
        setData((data ?? []) as unknown as PerfAnnotation[]);
        setLoading(false);
      }
    };
    void fetchAll();

    // Realtime — stream new annotations as they're inserted.
    const channel = supabase
      .channel(`perf-anns-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "performance_annotations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as PerfAnnotation;
          if (row.session_kind !== sessionKind) return;
          if (participantId && row.participant_id !== participantId) return;
          setData((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "performance_annotations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const id = (payload.old as PerfAnnotation | undefined)?.id;
          if (!id) return;
          setData((prev) => prev.filter((r) => r.id !== id));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, sessionKind, participantId]);

  return { data, loading };
}