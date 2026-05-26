import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QAMsg = { role: "user" | "assistant"; content: string };

export type RecordType = "live_session" | "debate" | "change_my_mind" | "imported_record";

export interface QATarget {
  recordType: RecordType;
  recordId: string;
}

/**
 * Shared chat state for the Dynamo (AI Q&A) tab inside a session notebook.
 * Keyed by record so switching tabs preserves the conversation.
 * State is in-memory only (matches the prior floating chat behavior).
 *
 * Accepts either a legacy `sessionId: string` (Live Session) or a target
 * `{ recordType, recordId }` for Debates / CMM.
 */
export const useRecordQA = (
  arg: string | QATarget,
  shareToken?: string | null,
) => {
  const recordType: RecordType = typeof arg === "string" ? "live_session" : arg.recordType;
  const recordId = typeof arg === "string" ? arg : arg.recordId;
  const conversationKey = `${recordType}:${recordId}`;

  const [messages, setMessages] = useState<QAMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Reset when the conversation target changes.
  const lastKeyRef = useRef(conversationKey);
  useEffect(() => {
    if (lastKeyRef.current !== conversationKey) {
      lastKeyRef.current = conversationKey;
      setMessages([]);
      setInput("");
      setLoading(false);
    }
  }, [conversationKey]);

  // Track current auth user (no getSession, per project rules).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load persisted history + subscribe to realtime changes for this record.
  // Skipped for share-token (unauthenticated) viewers.
  useEffect(() => {
    if (shareToken) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("record_qa_messages")
        .select("role, content, created_at")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: true });
      if (cancelled || error || !data) return;
      setMessages(
        data.map((r) => ({ role: r.role as "user" | "assistant", content: r.content })),
      );
    })();

    const channel = supabase
      .channel(`record-qa:${recordType}:${recordId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "record_qa_messages",
          filter: `record_id=eq.${recordId}`,
        },
        (payload) => {
          const row = payload.new as {
            role: "user" | "assistant";
            content: string;
            record_type: string;
            user_id: string;
          };
          if (row.record_type !== recordType) return;
          if (userIdRef.current && row.user_id !== userIdRef.current) return;
          setMessages((prev) => {
            // De-dupe: skip if last message matches (optimistic insert already applied).
            const last = prev[prev.length - 1];
            if (last && last.role === row.role && last.content === row.content) return prev;
            return [...prev, { role: row.role, content: row.content }];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [recordType, recordId, shareToken]);

  const persist = useCallback(
    async (role: "user" | "assistant", content: string) => {
      if (shareToken) return;
      const uid = userIdRef.current;
      if (!uid) return;
      await supabase.from("record_qa_messages").insert({
        user_id: uid,
        record_type: recordType,
        record_id: recordId,
        role,
        content,
      });
    },
    [recordType, recordId, shareToken],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: QAMsg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);
    void persist("user", text);

    try {
      const body: any = {
        // Legacy field for live sessions; edge function still accepts it.
        sessionId: recordType === "live_session" ? recordId : undefined,
        recordType,
        recordId,
        messages: allMessages,
      };
      if (shareToken) body.shareToken = shareToken;

      const { data, error } = await supabase.functions.invoke("record-qa", { body });

      if (error) {
        const status = (error as any)?.status;
        if (status === 429) toast.error("Rate limited — try again shortly.");
        else if (status === 402) toast.error("AI credits exhausted.");
        else toast.error("Failed to get a response.");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      void persist("assistant", data.reply);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, recordType, recordId, shareToken, persist]);

  return { messages, input, setInput, loading, send };
};

export default useRecordQA;