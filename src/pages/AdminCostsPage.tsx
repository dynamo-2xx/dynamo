import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Download } from "lucide-react";
import { FOUNDER_USER_ID } from "@/lib/founder";

type Settings = {
  id: string;
  budget_ai_usd: number;
  budget_speech_usd: number;
  budget_cloud_usd: number;
  budget_stripe_usd: number;
  monthly_revenue_goal_usd: number | null;
};

type UserRow = {
  user_id: string;
  display_name: string;
  ai_calls: number;
  ai_cost: number;
  speech_minutes: number;
  speech_cost: number;
  total_cost: number;
  last_active: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  ai: "Lovable AI",
  speech: "Deepgram",
  cloud: "Lovable Cloud",
  stripe: "Stripe fees",
};

function colorClass(pct: number) {
  if (pct < 50) return "bg-emerald-500";
  if (pct < 90) return "bg-amber-500";
  return "bg-red-500";
}

function monthStartISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default function AdminCostsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [spend, setSpend] = useState<Record<string, number>>({ ai: 0, speech: 0, cloud: 0, stripe: 0 });
  const [revenue, setRevenue] = useState(0);
  const [free, setFree] = useState<UserRow[]>([]);
  const [pro, setPro] = useState<UserRow[]>([]);
  const [editing, setEditing] = useState<null | { field: keyof Settings; label: string; value: string }>(null);

  // Founder gate
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAllowed(false);
      return;
    }
    if (FOUNDER_USER_ID && user.id !== FOUNDER_USER_ID) {
      setAllowed(false);
      return;
    }
    // Fall back to admin role check
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      const isAdmin = (data as any)?.role === "admin";
      const founderMatch = FOUNDER_USER_ID && user.id === FOUNDER_USER_ID;
      setAllowed(!!(isAdmin || founderMatch));
    })();
  }, [user, loading]);

  // Load data
  useEffect(() => {
    if (!allowed) return;
    loadAll();
  }, [allowed]);

  async function loadAll() {
    const since = monthStartISO();

    const [{ data: s }, { data: ai }, { data: sp }, { data: dc }] = await Promise.all([
      (supabase as any).from("founder_settings").select("*").limit(1).single(),
      (supabase as any).from("ai_usage_log").select("user_id, cost_usd, created_at").gte("created_at", since),
      (supabase as any).from("speech_usage_log").select("user_id, cost_usd, minutes, created_at").gte("created_at", since),
      (supabase as any).from("daily_costs").select("source, cost_usd, date").gte("date", since.slice(0, 10)),
    ]);

    if (s) setSettings(s as Settings);

    // Month-to-date spend per source: prefer raw logs for ai/speech, daily_costs for cloud/stripe
    const aiTotal = (ai || []).reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0);
    const speechTotal = (sp || []).reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0);
    let cloudTotal = 0;
    let stripeTotal = 0;
    for (const row of dc || []) {
      if (row.source === "cloud") cloudTotal += Number(row.cost_usd || 0);
      if (row.source === "stripe") stripeTotal += Number(row.cost_usd || 0);
    }
    setSpend({ ai: aiTotal, speech: speechTotal, cloud: cloudTotal, stripe: stripeTotal });

    // Revenue from daily_costs is not appropriate — we don't have a revenue table yet.
    // Placeholder: 0 (Stripe webhook integration will populate this in §17 billing-ops).
    setRevenue(0);

    // Aggregate per-user
    const byUser = new Map<string, UserRow>();
    for (const r of ai || []) {
      if (!r.user_id) continue;
      const u = byUser.get(r.user_id) || { user_id: r.user_id, display_name: "", ai_calls: 0, ai_cost: 0, speech_minutes: 0, speech_cost: 0, total_cost: 0, last_active: null };
      u.ai_calls += 1;
      u.ai_cost += Number(r.cost_usd || 0);
      if (!u.last_active || r.created_at > u.last_active) u.last_active = r.created_at;
      byUser.set(r.user_id, u);
    }
    for (const r of sp || []) {
      if (!r.user_id) continue;
      const u = byUser.get(r.user_id) || { user_id: r.user_id, display_name: "", ai_calls: 0, ai_cost: 0, speech_minutes: 0, speech_cost: 0, total_cost: 0, last_active: null };
      u.speech_minutes += Number(r.minutes || 0);
      u.speech_cost += Number(r.cost_usd || 0);
      if (!u.last_active || r.created_at > u.last_active) u.last_active = r.created_at;
      byUser.set(r.user_id, u);
    }
    for (const u of byUser.values()) u.total_cost = u.ai_cost + u.speech_cost;

    // Pull display names
    const userIds = Array.from(byUser.keys());
    if (userIds.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      for (const p of profs || []) {
        const u = byUser.get(p.user_id);
        if (u) u.display_name = p.display_name || "—";
      }
    }

    const rows = Array.from(byUser.values()).sort((a, b) => b.total_cost - a.total_cost);
    // No subscription table yet → all users land in Free for now
    setFree(rows);
    setPro([]);
  }

  async function saveSetting() {
    if (!editing || !settings) return;
    const num = editing.value === "" ? null : Number(editing.value);
    if (num !== null && (Number.isNaN(num) || num < 0)) return;
    const update: any = { [editing.field]: num };
    await (supabase as any).from("founder_settings").update(update).eq("id", settings.id);
    setEditing(null);
    loadAll();
  }

  function exportCsv(rows: UserRow[], filename: string) {
    const header = ["user_id", "display_name", "ai_calls", "ai_cost", "speech_minutes", "speech_cost", "total_cost", "last_active"];
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [r.user_id, JSON.stringify(r.display_name), r.ai_calls, r.ai_cost.toFixed(4), r.speech_minutes.toFixed(2), r.speech_cost.toFixed(4), r.total_cost.toFixed(4), r.last_active || ""].join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
    if (!settings) return { totalBudget: 0, totalSpend: 0, totalPct: 0 };
    const totalBudget =
      Number(settings.budget_ai_usd) +
      Number(settings.budget_speech_usd) +
      Number(settings.budget_cloud_usd) +
      Number(settings.budget_stripe_usd);
    const totalSpend = spend.ai + spend.speech + spend.cloud + spend.stripe;
    const totalPct = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;
    return { totalBudget, totalSpend, totalPct };
  }, [settings, spend]);

  if (loading || allowed === null) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!allowed) {
    navigate("/", { replace: true });
    return null;
  }
  if (!settings) {
    return <div className="p-8 text-sm text-muted-foreground">Initializing settings…</div>;
  }

  const sources: { key: keyof Settings; spendKey: keyof typeof spend; label: string }[] = [
    { key: "budget_ai_usd", spendKey: "ai", label: "Lovable AI" },
    { key: "budget_speech_usd", spendKey: "speech", label: "Deepgram" },
    { key: "budget_cloud_usd", spendKey: "cloud", label: "Lovable Cloud" },
    { key: "budget_stripe_usd", spendKey: "stripe", label: "Stripe fees" },
  ];

  const revenueGoal = Number(settings.monthly_revenue_goal_usd || 0);
  const revenuePct = revenueGoal > 0 ? (revenue / revenueGoal) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="font-display text-3xl">Cost dashboard</h1>
        <p className="text-sm text-muted-foreground font-body">
          Month-to-date spend vs editable budgets. Founder only.
        </p>
      </header>

      {/* Headline bars */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-body text-sm font-medium">Total cost</h2>
            <span className="text-sm font-mono">
              ${totals.totalSpend.toFixed(2)} / ${totals.totalBudget.toFixed(2)}
              <span className="text-muted-foreground"> ({totals.totalPct.toFixed(0)}%)</span>
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full ${colorClass(totals.totalPct)} transition-all`}
              style={{ width: `${Math.min(100, totals.totalPct)}%` }}
            />
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-body text-sm font-medium flex items-center gap-2">
              Monthly revenue
              <button
                onClick={() =>
                  setEditing({
                    field: "monthly_revenue_goal_usd",
                    label: "Monthly revenue goal (USD)",
                    value: settings.monthly_revenue_goal_usd?.toString() || "",
                  })
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </h2>
            <span className="text-sm font-mono">
              ${revenue.toFixed(2)} / ${revenueGoal.toFixed(2)}
              {revenueGoal > 0 && (
                <span className="text-muted-foreground"> ({revenuePct.toFixed(0)}%)</span>
              )}
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, revenuePct)}%` }}
            />
          </div>
          {revenueGoal === 0 && (
            <p className="text-xs text-muted-foreground">Click the pencil to set a goal.</p>
          )}
        </div>
      </section>

      {/* Per-source bars */}
      <section className="border border-border rounded-lg p-4 space-y-3">
        <h2 className="font-body text-sm font-medium">Per-source budgets</h2>
        {sources.map(({ key, spendKey, label }) => {
          const budget = Number(settings[key] || 0);
          const used = spend[spendKey];
          const pct = budget > 0 ? (used / budget) * 100 : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-body">
                <span className="flex items-center gap-2">
                  {label}
                  <button
                    onClick={() =>
                      setEditing({
                        field: key,
                        label: `${label} monthly budget (USD)`,
                        value: String(settings[key] || 0),
                      })
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </span>
                <span className="font-mono">
                  ${used.toFixed(2)} / ${budget.toFixed(2)}
                  <span className="text-muted-foreground"> ({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full ${colorClass(pct)} transition-all`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Free / Pro tables */}
      <section className="grid md:grid-cols-2 gap-6">
        <UserTable
          title="Free users"
          rows={free}
          showMrr={false}
          onExport={() => exportCsv(free, "free-users.csv")}
        />
        <UserTable
          title="Pro users"
          rows={pro}
          showMrr
          onExport={() => exportCsv(pro, "pro-users.csv")}
        />
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.label}</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={editing?.value || ""}
            onChange={(e) => editing && setEditing({ ...editing, value: e.target.value })}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveSetting}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserTable({
  title,
  rows,
  showMrr,
  onExport,
}: {
  title: string;
  rows: UserRow[];
  showMrr: boolean;
  onExport: () => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-body text-sm font-medium">{title} ({rows.length})</h2>
        <Button variant="ghost" size="sm" onClick={onExport} className="gap-1">
          <Download className="w-3 h-3" /> CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">30d $</TableHead>
              <TableHead className="text-right">AI</TableHead>
              <TableHead className="text-right">Min</TableHead>
              {showMrr && <TableHead className="text-right">MRR</TableHead>}
              <TableHead>Last active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showMrr ? 6 : 5} className="text-center text-xs text-muted-foreground py-6">
                  No usage yet.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-body text-xs">{r.display_name || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">${r.total_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.ai_calls}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.speech_minutes.toFixed(1)}</TableCell>
                  {showMrr && <TableCell className="text-right font-mono text-xs">—</TableCell>}
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.last_active ? new Date(r.last_active).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span className="text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}