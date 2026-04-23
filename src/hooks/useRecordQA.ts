import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QAMsg = { role: "user" | "assistant"; content: string };

/**
 * Shared chat state for the Dynamo (AI Q&A) tab inside a session notebook.
 * Keyed by sessionId so switching tabs preserves the conversation.
 * State is in-memory only (matches the prior floating chat behavior).
 */
export const useRecordQA = (
  sessionId: string,
  shareToken?: string | null,
) => {
  const [messages, setMessages] = useState<QAMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset when the session changes.
  const lastSessionRef = useRef(sessionId);
  useEffect(() => {
    if (lastSessionRef.current !== sessionId) {
      lastSessionRef.current = sessionId;
      setMessages([]);
      setInput("");
      setLoading(false);
    }
  }, [sessionId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: QAMsg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    try {
      const body: any = { sessionId, messages: allMessages };
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
  }, [input, loading, messages, sessionId, shareToken]);

  return { messages, input, setInput, loading, send };
};

export default useRecordQA;