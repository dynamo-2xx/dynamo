import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationToaster() {
  const navigate = useNavigate();
  const { items, loading, markRead } = useNotifications();
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!readyRef.current) {
      seenRef.current = new Set(items.map((n) => n.id));
      readyRef.current = true;
      return;
    }
    const fresh = items.filter((n) => !seenRef.current.has(n.id));
    fresh.forEach((n) => {
      seenRef.current.add(n.id);
      if (n.type !== "session_started") return;
      const route = (n.metadata as any)?.route || (n.debate_id ? `/debate/${n.debate_id}` : "/notifications");
      toast(n.title, {
        description: n.body || "The session has started.",
        action: {
          label: "ENTER",
          onClick: async () => {
            await markRead(n.id);
            navigate(route);
          },
        },
      });
    });
  }, [items, loading, markRead, navigate]);

  return null;
}