// §18 — Cost monitor. Designed to be invoked by pg_cron multiple times a day.
// Two modes via `?mode=`:
//   - "snapshot" (00:10 UTC): rolls yesterday's per-call logs into daily_costs
//   - "budget"   (00:15 UTC): recomputes month-to-date spend per source and
//                              fires tier alerts (50/75/90/100%)
//   - "anomaly"  (23:55 UTC): checks today vs trailing 7-day avg; if >3×,
//                              fires one anomaly alert
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";
import { costAlert } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const FOUNDER_EMAIL = Deno.env.get("FOUNDER_EMAIL") || "";
const TIERS = [50, 75, 90, 100];

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthStartISO(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function runSnapshot() {
  const sb = admin();
  const yesterday = new Date(Date.now() - 86_400_000);
  const start = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())).toISOString();
  const end = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate() + 1)).toISOString();
  const date = ymd(yesterday);

  const [{ data: ai }, { data: sp }] = await Promise.all([
    sb.from("ai_usage_log").select("cost_usd").gte("created_at", start).lt("created_at", end),
    sb.from("speech_usage_log").select("cost_usd").gte("created_at", start).lt("created_at", end),
  ]);
  const aiTotal = (ai || []).reduce((s, r: any) => s + Number(r.cost_usd || 0), 0);
  const speechTotal = (sp || []).reduce((s, r: any) => s + Number(r.cost_usd || 0), 0);

  await sb.from("daily_costs").upsert(
    [
      { date, source: "ai", cost_usd: aiTotal },
      { date, source: "speech", cost_usd: speechTotal },
    ],
    { onConflict: "date,source" },
  );
  return { date, ai: aiTotal, speech: speechTotal };
}

async function runBudgetCheck() {
  const sb = admin();
  const { data: settings } = await sb.from("founder_settings").select("*").limit(1).single();
  if (!settings) return { skipped: "no_settings" };

  const since = monthStartISO();
  const [{ data: ai }, { data: sp }, { data: dc }] = await Promise.all([
    sb.from("ai_usage_log").select("cost_usd").gte("created_at", since),
    sb.from("speech_usage_log").select("cost_usd").gte("created_at", since),
    sb.from("daily_costs").select("source, cost_usd, date").gte("date", since.slice(0, 10)),
  ]);
  const aiTotal = (ai || []).reduce((s, r: any) => s + Number(r.cost_usd || 0), 0);
  const speechTotal = (sp || []).reduce((s, r: any) => s + Number(r.cost_usd || 0), 0);
  let cloudTotal = 0, stripeTotal = 0;
  for (const r of dc || []) {
    if ((r as any).source === "cloud") cloudTotal += Number((r as any).cost_usd || 0);
    if ((r as any).source === "stripe") stripeTotal += Number((r as any).cost_usd || 0);
  }

  const sources: { key: string; spend: number; budget: number; label: string }[] = [
    { key: "ai", spend: aiTotal, budget: Number((settings as any).budget_ai_usd), label: "Lovable AI" },
    { key: "speech", spend: speechTotal, budget: Number((settings as any).budget_speech_usd), label: "Deepgram" },
    { key: "cloud", spend: cloudTotal, budget: Number((settings as any).budget_cloud_usd), label: "Lovable Cloud" },
    { key: "stripe", spend: stripeTotal, budget: Number((settings as any).budget_stripe_usd), label: "Stripe fees" },
  ];

  const period = monthKey();
  const fired: string[] = [];
  for (const s of sources) {
    if (s.budget <= 0) continue;
    const pct = (s.spend / s.budget) * 100;
    for (const t of TIERS) {
      if (pct < t) continue;
      const { error: dupErr } = await sb.from("cost_alerts").insert({
        alert_type: "budget", source: s.key, threshold: t, period_key: period,
      });
      if (dupErr) continue; // unique violation = already fired this cycle
      const tpl = costAlert({
        source: s.label,
        pct: Math.round(pct),
        spend: `$${s.spend.toFixed(2)}`,
        budget: `$${s.budget.toFixed(2)}`,
      });
      if (FOUNDER_EMAIL) await sendEmail({ to: FOUNDER_EMAIL, ...tpl });
      fired.push(`${s.key}:${t}`);
    }
  }
  return { period, fired };
}

async function runAnomalyCheck() {
  const sb = admin();
  const today = ymd(new Date());
  const period = today;
  // Today total (ai + speech raw + cloud/stripe daily_costs row)
  const dayStart = `${today}T00:00:00Z`;
  const [{ data: ai }, { data: sp }, { data: dc }] = await Promise.all([
    sb.from("ai_usage_log").select("cost_usd").gte("created_at", dayStart),
    sb.from("speech_usage_log").select("cost_usd").gte("created_at", dayStart),
    sb.from("daily_costs").select("source, cost_usd").eq("date", today),
  ]);
  const todayTotal =
    (ai || []).reduce((s, r: any) => s + Number(r.cost_usd || 0), 0) +
    (sp || []).reduce((s, r: any) => s + Number(r.cost_usd || 0), 0) +
    (dc || []).reduce((s, r: any) => s + Number((r as any).cost_usd || 0), 0);

  // Trailing 7-day average from daily_costs (all sources summed per day)
  const since = ymd(new Date(Date.now() - 7 * 86_400_000));
  const { data: hist } = await sb.from("daily_costs").select("date, cost_usd").gte("date", since).lt("date", today);
  const byDay: Record<string, number> = {};
  for (const r of hist || []) {
    byDay[(r as any).date] = (byDay[(r as any).date] || 0) + Number((r as any).cost_usd || 0);
  }
  const dayVals = Object.values(byDay);
  const avg = dayVals.length > 0 ? dayVals.reduce((s, v) => s + v, 0) / dayVals.length : 0;

  if (avg > 0 && todayTotal > avg * 3) {
    const { error: dup } = await sb.from("cost_alerts").insert({
      alert_type: "anomaly", source: null, threshold: null, period_key: period,
    });
    if (!dup && FOUNDER_EMAIL) {
      await sendEmail({
        to: FOUNDER_EMAIL,
        subject: `[Dynamo costs] Daily spike detected`,
        text: `Today $${todayTotal.toFixed(2)} vs 7d avg $${avg.toFixed(2)}`,
        html: `<p>Today spend <strong>$${todayTotal.toFixed(2)}</strong> exceeded 3× the 7-day average ($${avg.toFixed(2)}).</p><p><a href="https://dynamo.today/admin/costs">Open dashboard</a></p>`,
        category: "essential",
      });
      return { fired: true, todayTotal, avg };
    }
  }
  return { fired: false, todayTotal, avg };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "budget";
    let out: unknown;
    if (mode === "snapshot") out = await runSnapshot();
    else if (mode === "anomaly") out = await runAnomalyCheck();
    else out = await runBudgetCheck();
    return new Response(JSON.stringify({ ok: true, mode, ...((out as object) ?? {}) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});