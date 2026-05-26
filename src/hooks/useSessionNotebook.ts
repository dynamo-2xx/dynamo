import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotebookThoughtBlock {
  type: "text" | "image";
  value: string;
}

export type RecordType = "live_session" | "debate" | "change_my_mind" | "imported_record";

export interface SessionNotebook {
  id: string;
  session_id: string;
  user_id: string;
  record_type: RecordType;
  record_id: string;
  thoughts: { blocks: NotebookThoughtBlock[] };
  my_take: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
}

export interface NotebookTarget {
  recordType: RecordType;
  recordId: string;
}

/** Resolve a legacy `sessionId` arg or a `{recordType, recordId}` target. */
function resolveTarget(arg: string | null | NotebookTarget | null): NotebookTarget | null {
  if (!arg) return null;
  if (typeof arg === "string") return { recordType: "live_session", recordId: arg };
  if (!arg.recordId) return null;
  return { recordType: arg.recordType, recordId: arg.recordId };
}

/**
 * Per-session, per-user private notebook. Auto-saves Thoughts (debounced 1s)
 * to session_notebooks. Exposes setters + a publish toggle.
 *
 * Accepts either a legacy `sessionId: string` (treated as a Live Session) or
 * `{ recordType, recordId }` for Debates / CMM.
 */
export function useSessionNotebook(arg: string | null | NotebookTarget) {
  const target = resolveTarget(arg);
  const recordType = target?.recordType ?? "live_session";
  const recordId = target?.recordId ?? null;
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
    if (!recordId || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("session_notebooks" as any)
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
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
  }, [recordType, recordId, user]);

  const persist = useCallback(async () => {
    if (!recordId || !user) return;
    const payload = {
      // Keep legacy session_id mirror for live sessions only.
      session_id: recordType === "live_session" ? recordId : null,
      record_type: recordType,
      record_id: recordId,
      user_id: user.id,
      thoughts: { blocks: [{ type: "text", value: thoughts }] },
      my_take: myTake || null,
    };
    const { data, error } = await supabase
      .from("session_notebooks" as any)
      .upsert(payload as any, { onConflict: "record_type,record_id,user_id" })
      .select()
      .maybeSingle();
    if (!error && data) {
      setNotebook(data as any as SessionNotebook);
      lastPersistedThoughtsRef.current = thoughts;
      lastPersistedTakeRef.current = myTake;
      dirtyRef.current = false;
    }
  }, [recordType, recordId, user, thoughts, myTake]);

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

  // Flush any pending edits when the hook unmounts so navigating away
  // (e.g. /debate/:id → /my-study/:id) never loses the last debounce window.
  const flushRef = useRef(flushNow);
  useEffect(() => { flushRef.current = flushNow; }, [flushNow]);
  useEffect(() => {
    return () => {
      void flushRef.current?.();
    };
  }, []);

  // Realtime: keep both surfaces (record page + /my-study/:id) in sync when
  // the same notebook row changes elsewhere. Only apply remote values that
  // the local user isn't actively editing (no dirty pending writes).
  useEffect(() => {
    if (!recordId || !user) return;
    const channel = supabase
      .channel(`notebook:${recordType}:${recordId}:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_notebooks",
          filter: `record_id=eq.${recordId}`,
        },
        (payload) => {
          const row = payload.new as any as SessionNotebook;
          if (!row || row.user_id !== user.id || row.record_type !== recordType) return;
          setNotebook(row);
          if (!dirtyRef.current) {
            const incomingThoughts = (row.thoughts as any)?.blocks?.[0]?.value || "";
            const incomingTake = row.my_take || "";
            if (incomingThoughts !== lastPersistedThoughtsRef.current) {
              lastPersistedThoughtsRef.current = incomingThoughts;
              setThoughts(incomingThoughts);
            }
            if (incomingTake !== lastPersistedTakeRef.current) {
              lastPersistedTakeRef.current = incomingTake;
              setMyTake(incomingTake);
            }
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [recordType, recordId, user]);

  const publish = useCallback(async () => {
    if (!recordId || !user) return;
    await flushNow();
    const { data, error } = await supabase
      .from("session_notebooks" as any)
      .update({ published: true, published_at: new Date().toISOString() } as any)
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();
    if (!error && data) setNotebook(data as any as SessionNotebook);
  }, [recordType, recordId, user, flushNow]);

  const unpublish = useCallback(async () => {
    if (!recordId || !user) return;
    const { data, error } = await supabase
      .from("session_notebooks" as any)
      .update({ published: false, published_at: null } as any)
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();
    if (!error && data) setNotebook(data as any as SessionNotebook);
  }, [recordType, recordId, user]);

  const deleteMyTake = useCallback(async () => {
    setMyTake("");
    if (!recordId || !user) return;
    await supabase
      .from("session_notebooks" as any)
      .update({ my_take: null } as any)
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .eq("user_id", user.id);
    lastPersistedTakeRef.current = "";
  }, [recordType, recordId, user]);

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