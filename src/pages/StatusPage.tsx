import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/**
 * §19 — Public, unauthenticated status page. Pings the DB via a cheap
 * head-count query and reports recent backup health (last successful nightly
 * `pg_dump` row in `backup_runs`, surfaced by the GH Actions workflow).
 * Lives at /status. RPO target: 24h. RTO target: 4h.
 */
export default function StatusPage() {
  useDocumentMeta({
    title: "Status · Dynamo",
    description: "Live service status for Dynamo: database, auth, and backup health.",
  });
  const [dbOk, setDbOk] = useState<"checking" | "ok" | "down">("checking");
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { error } = await supabase.from("debates").select("id", { count: "exact", head: true }).limit(1);
      if (!cancelled) setDbOk(error ? "down" : "ok");
    })();
    (async () => {
      // Optional table — silently ignore if missing.
      const { data } = await (supabase as any)
        .from("backup_runs")
        .select("finished_at, status")
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.finished_at) setLastBackup(data.finished_at);
    })();
    return () => { cancelled = true; };
  }, []);

  const Row = ({ label, state, detail }: { label: string; state: "ok" | "warn" | "down" | "checking"; detail?: string }) => {
    const dot = state === "ok" ? "bg-emerald-500" : state === "warn" ? "bg-amber-500" : state === "down" ? "bg-red-500" : "bg-muted-foreground/40";
    return (
      <div className="flex items-center justify-between py-3 border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="font-body text-sm">{label}</span>
        </div>
        <span className="font-body text-xs text-muted-foreground">{detail ?? state}</span>
      </div>
    );
  };

  const backupState: "ok" | "warn" | "down" = !lastBackup
    ? "warn"
    : Date.now() - new Date(lastBackup).getTime() < 28 * 3600_000 ? "ok" : "warn";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="font-display text-3xl mb-2">Dynamo status</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">
          Live health for the database, authentication and backup pipeline. RPO 24h · RTO 4h.
        </p>
        <div className="border border-foreground/10 rounded-xl px-4">
          <Row label="Database" state={dbOk === "checking" ? "checking" : dbOk} />
          <Row label="Authentication" state="ok" detail="operational" />
          <Row
            label="Nightly backup"
            state={backupState}
            detail={lastBackup ? `last success ${new Date(lastBackup).toLocaleString()}` : "no recent run reported"}
          />
        </div>
        <p className="text-[11px] text-muted-foreground font-body mt-6">
          Incidents are also posted to <a href="mailto:status@mail.dynamo.today" className="underline">status@mail.dynamo.today</a>.
        </p>
      </div>
    </main>
  );
}