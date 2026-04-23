import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RecordType = "live_session" | "debate" | "change_my_mind";

export interface SessionAnnotation {
  id: string;
  session_id: string;
  user_id: string;
  record_type: RecordType;
  record_id: string;
  node_kind: "summary" | "transcript" | "argument";
  node_id: string;
  excerpt: string;
  note: string;
  char_start: number | null;
  char_end: number | null;
  created_at: string;
}

export interface AnnotationsTarget {
  recordType: RecordType;
  recordId: string;
}

function resolveTarget(arg: string | null | AnnotationsTarget): AnnotationsTarget | null {
  if (!arg) return null;
  if (typeof arg === "string") return { recordType: "live_session", recordId: arg };
  if (!arg.recordId) return null;
  return { recordType: arg.recordType, recordId: arg.recordId };
}

/** Private per-user list of highlighted excerpts + notes for one session. */
export function useSessionAnnotations(arg: string | null | AnnotationsTarget) {
  const target = resolveTarget(arg);
  const recordType = target?.recordType ?? "live_session";
  const recordId = target?.recordId ?? null;
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<SessionAnnotation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!recordId || !user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("session_annotations" as any)
      .select("*")
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAnnotations((data || []) as any as SessionAnnotation[]);
    setLoading(false);
  }, [recordType, recordId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (input: {
      node_kind: "summary" | "transcript" | "argument";
      node_id: string;
      excerpt: string;
      note: string;
      char_start?: number | null;
      char_end?: number | null;
    }) => {
      if (!recordId || !user) return null;
      const { data, error } = await supabase
        .from("session_annotations" as any)
        .insert({
          session_id: recordType === "live_session" ? recordId : null,
          record_type: recordType,
          record_id: recordId,
          user_id: user.id,
          ...input,
        } as any)
        .select()
        .maybeSingle();
      if (!error && data) {
        setAnnotations((prev) => [data as any as SessionAnnotation, ...prev]);
        return data as any as SessionAnnotation;
      }
      return null;
    },
    [recordType, recordId, user],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("session_annotations" as any).delete().eq("id", id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    },
    [],
  );

  const update = useCallback(
    async (id: string, patch: { note?: string; excerpt?: string }) => {
      const { data, error } = await supabase
        .from("session_annotations" as any)
        .update(patch as any)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (!error && data) {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === id ? (data as any as SessionAnnotation) : a)),
        );
      }
    },
    [],
  );

  return { annotations, loading, add, remove, update, refresh };
}