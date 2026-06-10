import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ArgumentUnit = {
  id: string;
  session_id: string;
  session_kind: "debate" | "cmm" | "live" | "imported";
  subtopic_title: string | null;
  thread_id: string;
  turn_index: number;
  speaker_label: string | null;
  speaker_side: string | null;
  source_text: string;
  anatomy: Array<{ part: string; text: string; note?: string }>;
  relationship_tag:
    | "ANCHOR" | "SUPPORT" | "CHALLENGE" | "COUNTER" | "EXTENSION"
    | "CONCESSION" | "REFRAME" | "QUALIFICATION" | "SYNTHESIS" | "PIVOT" | "UNRESOLVED";
  relates_to: string | null;
  relationship_note: string | null;
  is_standalone_concession: boolean;
  pass_kind: "structure_live" | "structure_final";
  created_at: string;
};

/** Fetches argument_units for a session and subscribes to realtime inserts. */
export function useArgumentUnits(
  sessionId: string | null | undefined,
  sessionKind: "debate" | "cmm" | "live" | "imported" | null | undefined,
) {
  const [units, setUnits] = useState<ArgumentUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId || !sessionKind) {
      setUnits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("argument_units")
        .select("*")
        .eq("session_id", sessionId)
        .eq("session_kind", sessionKind)
        .order("thread_id", { ascending: true })
        .order("turn_index", { ascending: true });
      if (cancelled) return;
      setUnits((data ?? []) as unknown as ArgumentUnit[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`argument_units:${sessionKind}:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "argument_units", filter: `session_id=eq.${sessionId}` },
        async () => {
          const { data } = await supabase
            .from("argument_units")
            .select("*")
            .eq("session_id", sessionId)
            .eq("session_kind", sessionKind)
            .order("thread_id", { ascending: true })
            .order("turn_index", { ascending: true });
          if (!cancelled) setUnits((data ?? []) as unknown as ArgumentUnit[]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId, sessionKind]);

  return { units, loading };
}

/** Convenience: fire the structural pass. Safe to call repeatedly. */
export async function triggerStructurePass(
  sessionId: string,
  sessionKind: "debate" | "cmm" | "live" | "imported",
  passKind: "structure_live" | "structure_final" = "structure_live",
) {
  try {
    await supabase.functions.invoke("trigger-structure-pass", {
      body: { session_id: sessionId, session_kind: sessionKind, pass_kind: passKind },
    });
  } catch (_) { /* fire-and-forget */ }
}