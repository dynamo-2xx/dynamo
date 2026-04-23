import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotebookThoughtBlock {
  type: "text" | "image";
  value: string;
}

export interface SessionNotebook {
  id: string;
  session_id: string;
  user_id: string;
  thoughts: { blocks: NotebookThoughtBlock[] };
  my_take: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
}

/**
 * Per-session, per-user private notebook. Auto-saves Thoughts (debounced 1s)
 * to session_notebooks. Exposes setters + a publish toggle.
 */
export function useSessionNotebook(sessionId: string | null) {
  const { user } = useAuth();
  const [notebook, setNotebook] = useState<SessionNotebook | null>(null);
  const [thoughts, setThoughts] = useState<string>("");
  const [myTake, setMyTake] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const lastPersistedThoughtsRef = useRef<string>("");
  const lastPersistedTakeRef = useRef<string>("");

  // Load
  useEffect(() => {
    if (!sessionId || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("session_notebooks" as any)
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const nb = data as any as SessionNotebook;
        setNotebook(nb);
        const initial = (nb.thoughts as any)?.blocks?.[0]?.value || "";
        setThoughts(initial);
        setMyTake(nb.my_take || "");
        lastPersistedThoughtsRef.current = initial;
        lastPersistedTakeRef.current = nb.my_take || "";
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, user]);

  const persist = useCallback(async () => {
    if (!sessionId || !user) return;
    const payload = {
      session_id: sessionId,
      user_id: user.id,
      thoughts: { blocks: [{ type: "text", value: thoughts }] },
      my_take: myTake || null,
    };
    const { data, error } = await supabase
      .from("session_notebooks" as any)
      .upsert(payload as any, { onConflict: "session_id,user_id" })
      .select()
      .maybeSingle();
    if (!error && data) {
      setNotebook(data as any as SessionNotebook);
      lastPersistedThoughtsRef.current = thoughts;
      lastPersistedTakeRef.current = myTake;
      dirtyRef.current = false;
    }
  }, [sessionId, user, thoughts, myTake]);

  // Debounced auto-save on Thoughts/MyTake change
  useEffect(() => {
    if (loading) return;
    if (
      thoughts === lastPersistedThoughtsRef.current &&
      myTake === lastPersistedTakeRef.current
    ) {
      return;
    }
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 1000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [thoughts, myTake, persist, loading]);

  const flushNow = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (dirtyRef.current) await persist();
  }, [persist]);

  const publish = useCallback(async () => {
    if (!sessionId || !user) return;
    await flushNow();
    const { data, error } = await supabase
      .from("session_notebooks" as any)
      .update({ published: true, published_at: new Date().toISOString() } as any)
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();
    if (!error && data) setNotebook(data as any as SessionNotebook);
  }, [sessionId, user, flushNow]);

  const unpublish = useCallback(async () => {
    if (!sessionId || !user) return;
    const { data, error } = await supabase
      .from("session_notebooks" as any)
      .update({ published: false, published_at: null } as any)
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();
    if (!error && data) setNotebook(data as any as SessionNotebook);
  }, [sessionId, user]);

  const deleteMyTake = useCallback(async () => {
    setMyTake("");
    if (!sessionId || !user) return;
    await supabase
      .from("session_notebooks" as any)
      .update({ my_take: null } as any)
      .eq("session_id", sessionId)
      .eq("user_id", user.id);
    lastPersistedTakeRef.current = "";
  }, [sessionId, user]);

  return {
    notebook,
    loading,
    thoughts,
    setThoughts,
    myTake,
    setMyTake,
    flushNow,
    publish,
    unpublish,
    deleteMyTake,
    isPublished: !!notebook?.published,
  };
}