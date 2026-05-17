import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PerfAnnotation = {
  id: string;
  session_id: string;
  session_kind: "debate" | "cmm" | "live";
  participant_id: string | null;
  subtopic_id: string | null;
  transcript_entry_id: string | null;
  char_start: number | null;
  char_end: number | null;
  attribute_group: "argumentative_integrity" | "rhetorical_effectiveness" | "engagement_quality" | "cognitive_depth";
  sub_attribute: string | null;
  severity: "green" | "orange" | "red";
  pass_kind: "live" | "deep";
  explanation: string;
  recommendation: string | null;
  created_at: string;
};

export function usePerformanceAnnotations(
  sessionId: string | null | undefined,
  sessionKind: "debate" | "cmm" | "live",
  participantId?: string | null,
) {
  const [data, setData] = useState<PerfAnnotation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    let q = supabase
      .from("performance_annotations")
      .select("*")
      .eq("session_id", sessionId)
      .eq("session_kind", sessionKind)
      .order("created_at", { ascending: false });
    if (participantId) q = q.eq("participant_id", participantId);
    q.then(({ data }) => { if (!cancelled) { setData((data ?? []) as PerfAnnotation[]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [sessionId, sessionKind, participantId]);

  return { data, loading };
}