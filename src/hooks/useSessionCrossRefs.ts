import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CrossRefKind = "contradiction" | "shared_evidence" | "restated";

export interface SessionCrossRef {
  id: string;
  session_id: string;
  from_node: string;
  to_node: string;
  kind: CrossRefKind;
  confidence: number | null;
  created_at: string;
}

/**
 * Loads AI-detected cross-references and indexes them per-node with
 * a stable global footnote number per session.
 */
export function useSessionCrossRefs(sessionId: string | null) {
  const [refs, setRefs] = useState<SessionCrossRef[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("session_cross_refs" as any)
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setRefs((data || []) as any as SessionCrossRef[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stable global numbering per session, in insertion order.
  const numberByRefId = useMemo(() => {
    const m = new Map<string, number>();
    refs.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [refs]);

  const refsByNode = useMemo(() => {
    const m = new Map<string, SessionCrossRef[]>();
    for (const r of refs) {
      if (!m.has(r.from_node)) m.set(r.from_node, []);
      m.get(r.from_node)!.push(r);
      if (!m.has(r.to_node)) m.set(r.to_node, []);
      m.get(r.to_node)!.push(r);
    }
    return m;
  }, [refs]);

  return { refs, loading, refsByNode, numberByRefId, refresh };
}