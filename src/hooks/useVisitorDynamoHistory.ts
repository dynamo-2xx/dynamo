import { useCallback, useEffect, useState } from "react";

export type VisitorMsg = { role: "user" | "assistant"; content: string };

const KEY = (notebookId: string) => `dynamo:visitor-chat:${notebookId}`;

/**
 * Visitor-private Dynamo chat history for a published notebook.
 * Persisted to localStorage so the visitor never sees the owner's chat,
 * and the owner never sees visitor chats.
 * If the visitor spawns their own notebook from this one, this history
 * can be copied via `exportForSpawn()` and re-seeded under the new id.
 */
export const useVisitorDynamoHistory = (notebookId: string | null) => {
  const [messages, setMessages] = useState<VisitorMsg[]>([]);

  useEffect(() => {
    if (!notebookId) return;
    try {
      const raw = localStorage.getItem(KEY(notebookId));
      setMessages(raw ? (JSON.parse(raw) as VisitorMsg[]) : []);
    } catch {
      setMessages([]);
    }
  }, [notebookId]);

  const persist = useCallback(
    (next: VisitorMsg[]) => {
      if (!notebookId) return;
      try {
        localStorage.setItem(KEY(notebookId), JSON.stringify(next));
      } catch {
        /* quota or disabled */
      }
    },
    [notebookId],
  );

  const append = useCallback(
    (msg: VisitorMsg) => {
      setMessages((prev) => {
        const next = [...prev, msg];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setMessages([]);
    if (notebookId) localStorage.removeItem(KEY(notebookId));
  }, [notebookId]);

  const seedInto = useCallback((targetNotebookId: string) => {
    if (!notebookId) return;
    try {
      const raw = localStorage.getItem(KEY(notebookId));
      if (raw) localStorage.setItem(KEY(targetNotebookId), raw);
    } catch {
      /* noop */
    }
  }, [notebookId]);

  return { messages, append, reset, seedInto };
};