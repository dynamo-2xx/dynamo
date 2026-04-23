import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SessionAnnotation {
  id: string;
  session_id: string;
  user_id: string;
  node_kind: "summary" | "transcript";
  node_id: string;
  excerpt: string;
  note: string;
  char_start: number | null;
  char_end: number | null;
  created_at: string;
}

/** Private per-user list of highlighted excerpts + notes for one session. */
export function useSessionAnnotations(sessionId: string | null) {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<SessionAnnotation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionId || !user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("session_annotations" as any)
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAnnotations((data || []) as any as SessionAnnotation[]);
    setLoading(false);
  }, [sessionId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (input: {
      node_kind: "summary" | "transcript";
      node_id: string;
      excerpt: string;
      note: string;
      char_start?: number | null;
      char_end?: number | null;
    }) => {
      if (!sessionId || !user) return null;
      const { data, error } = await supabase
        .from("session_annotations" as any)
        .insert({
          session_id: sessionId,
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
    [sessionId, user],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("session_annotations" as any).delete().eq("id", id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    },
    [],
  );

  return { annotations, loading, add, remove, refresh };
}