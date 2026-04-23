import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QAMsg = { role: "user" | "assistant"; content: string };

export type RecordType = "live_session" | "debate" | "change_my_mind";

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

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: QAMsg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

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
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, recordType, recordId, shareToken]);

  return { messages, input, setInput, loading, send };
};

export default useRecordQA;