import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface QueuedRow {
  participant_id: string;
  debate_id: string;
  topic: string;
  status: string;
  created_by: string;
}

/**
 * Persistent pill shown at the bottom of the app when the user is queued
 * for one or more debates that haven't gone live yet. Disappears the
 * moment the debate flips to `live` (the global NotificationToaster will
 * show the ENTER toast).
 */
export default function QueuedSessionStrip() {
  const { user } = useAuth();
  const [rows, setRows] = useState<QueuedRow[]>([]);

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("debate_participants")
        .select("id, debate_id, debates!inner(id, topic, status, created_by)")
        .eq("user_id", user.id);
      if (cancelled) return;
      const next: QueuedRow[] = (data ?? [])
        .map((r: any) => ({
          participant_id: r.id,
          debate_id: r.debate_id,
          topic: r.debates?.topic ?? "Debate",
          status: r.debates?.status ?? "",
          created_by: r.debates?.created_by ?? "",
        }))
        .filter(
          (r) =>
            (r.status === "draft" || r.status === "scheduled") &&
            r.created_by !== user.id, // hosts manage their own debate from the room
        );
      setRows(next);
    };
    load();

    const ch = supabase
      .channel(`queued-strip-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debate_participants", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "debates" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const leave = async (row: QueuedRow) => {
    const { error } = await supabase
      .from("debate_participants")
      .delete()
      .eq("id", row.participant_id);
    if (error) {
      toast.error("Couldn't leave the queue");
      return;
    }
    toast(`Left the queue for "${row.topic}"`);
    setRows((prev) => prev.filter((r) => r.participant_id !== row.participant_id));
  };

  if (rows.length === 0) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-4 z-40 flex flex-col gap-1.5 max-w-[92vw]">
      {rows.map((r) => (
        <div
          key={r.participant_id}
          className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-foreground text-background shadow-lg text-[12px] font-body"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Link to={`/debate/${r.debate_id}/preview`} className="truncate max-w-[200px] hover:underline">
            Queued: {r.topic}
          </Link>
          <button
            type="button"
            onClick={() => leave(r)}
            className="ml-1 w-6 h-6 rounded-full bg-background/15 hover:bg-background/25 inline-flex items-center justify-center"
            title="Leave queue"
            aria-label="Leave queue"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}