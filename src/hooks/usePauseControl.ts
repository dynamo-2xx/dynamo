import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Universal host pause/resume for debates, CMM (debates table), and live sessions.
 *
 * Debate uses a server-trusted snapshot RPC so resuming continues from the
 * exact remaining seconds captured at pause time — no time-shift drift, and
 * the timer never visibly "resets". Live sessions still use a plain UPDATE
 * (no per-turn timer to preserve).
 */
export function usePauseControl(opts: {
  kind: "debate" | "live";
  id: string | null | undefined;
  isHost: boolean;
  /** Current remaining seconds at pause time. Required for debate kind. */
  remainingSeconds?: number;
}) {
  const { kind, id, isHost, remainingSeconds } = opts;
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const table = kind === "live" ? "live_sessions" : "debates";

  // Initial fetch
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from(table).select("paused_at").eq("id", id).maybeSingle();
      setPausedAt((data as any)?.paused_at ?? null);
    })();
  }, [id, table]);

  // Realtime sync
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`pause-${table}-${id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${id}` },
        (payload: any) => setPausedAt(payload.new?.paused_at ?? null))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, table]);

  // Elapsed tick
  useEffect(() => {
    if (!pausedAt) { setElapsedMs(0); return; }
    const t = setInterval(() => setElapsedMs(Date.now() - new Date(pausedAt).getTime()), 1000);
    return () => clearInterval(t);
  }, [pausedAt]);

  const pause = useCallback(async () => {
    if (!id || !isHost) return;
    if (kind === "debate") {
      const { error } = await supabase.rpc("pause_debate" as any, {
        _debate_id: id,
        _remaining_seconds: Math.max(0, Math.floor(remainingSeconds ?? 0)),
      });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from(table).update({ paused_at: new Date().toISOString() }).eq("id", id);
      if (error) { toast.error(error.message); return; }
    }
    toast("Session paused — transcription halted");
  }, [id, isHost, table, kind, remainingSeconds]);

  const resume = useCallback(async () => {
    if (!id || !isHost) return;
    if (kind === "debate") {
      const { error } = await supabase.rpc("resume_debate" as any, { _debate_id: id });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from(table).update({ paused_at: null }).eq("id", id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Session resumed");
  }, [id, isHost, table, kind]);

  return { isPaused: !!pausedAt, pausedAt, elapsedMs, pause, resume };
}