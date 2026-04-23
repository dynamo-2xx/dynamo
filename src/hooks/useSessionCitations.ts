import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SessionCitation {
  id: string;
  session_id: string;
  summary_node_id: string;
  text: string;
  url: string | null;
  created_by: string;
  created_at: string;
}

/** Host-entered citations attached to a summary node. Read by anyone with session access. */
export function useSessionCitations(sessionId: string | null) {
  const { user } = useAuth();
  const [citations, setCitations] = useState<SessionCitation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("session_citations" as any)
      .select("*")
      .eq("session_id", sessionId);
    setCitations((data || []) as any as SessionCitation[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsert = useCallback(
    async (summary_node_id: string, text: string, url?: string | null) => {
      if (!sessionId || !user) return null;
      const existing = citations.find((c) => c.summary_node_id === summary_node_id);
      if (existing) {
        const { data } = await supabase
          .from("session_citations" as any)
          .update({ text, url: url || null } as any)
          .eq("id", existing.id)
          .select()
          .maybeSingle();
        if (data) {
          setCitations((prev) =>
            prev.map((c) => (c.id === existing.id ? (data as any as SessionCitation) : c)),
          );
        }
        return data as any as SessionCitation;
      }
      const { data } = await supabase
        .from("session_citations" as any)
        .insert({
          session_id: sessionId,
          created_by: user.id,
          summary_node_id,
          text,
          url: url || null,
        } as any)
        .select()
        .maybeSingle();
      if (data) setCitations((prev) => [...prev, data as any as SessionCitation]);
      return data as any as SessionCitation;
    },
    [sessionId, user, citations],
  );

  const remove = useCallback(async (id: string) => {
    await supabase.from("session_citations" as any).delete().eq("id", id);
    setCitations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const byNode = useCallback(
    (node_id: string) => citations.find((c) => c.summary_node_id === node_id) || null,
    [citations],
  );

  return { citations, loading, upsert, remove, byNode };
}