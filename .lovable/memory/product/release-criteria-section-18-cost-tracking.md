---
name: Release §18 Cost Tracking
description: Per-user cost attribution, $200/mo budget, tiered + anomaly alerts, no per-user cap.
type: feature
---

# §18 — Cost Tracking

**Decisions locked by founder:**
- Tracking depth: **Per-user cost attribution** — every AI call and Deepgram session writes a row tagged with `user_id` + `session_id`.
- Alerts: **Budget + anomaly** — tiered alerts at 50/75/90/100% of monthly budget AND a daily-spike anomaly alert.
- Monthly budget: **$200/month total** (Lovable Cloud + Lovable AI + Deepgram + Stripe fees combined).
- Per-user cap: **None.** Rely on §15 rate limits to prevent abuse.

**Assumed by me (challenge any):**
- That you accept the **abuse risk** of no per-user cap — a determined user hitting rate limits at the ceiling all month could theoretically rack up tens of dollars in AI + Deepgram costs alone. §15 limits (DMs 30/min, reports 10/hr, signup 5/IP/day) don't directly cap AI or speech calls. Worth a follow-up later if budget keeps blowing.
- That Stripe fees count toward the $200 budget (they're net revenue cost, not infrastructure cost — could be tracked separately).
- That weekly review of the founder dashboard is enough (no real-time monitoring beyond the alert thresholds).

## What gets tracked
Four cost sources, one unified daily snapshot:

| Source | What it measures | How it's gathered |
|---|---|---|
| **Lovable Cloud** | Compute, storage, egress, edge function invocations | Daily poll of Lovable Cloud billing API → `daily_costs` row |
| **Lovable AI** | Per-call token usage × model pricing | Every `ai-facilitator`, `analyze-transcript`, `record-qa`, `consolidate-notebook`, `detect-cross-refs` call writes to `ai_usage_log` with `user_id, session_id, model, input_tokens, output_tokens, estimated_cost_usd` |
| **Deepgram** | Per-session minutes streamed | Every `deepgram-token` mint writes `session_id` to `speech_usage_log`; on session end, we record duration → cost |
| **Stripe fees** | Per-transaction fees on Pro subs | Stripe webhook → `billing_events` table, cost = (gross - net) |

## Schema (to migrate)
- `ai_usage_log`: per-call ledger (user_id, session_id, function_name, model, tokens in/out, cost_usd, created_at). Admin-only RLS.
- `speech_usage_log`: per-session ledger (user_id, session_id, minutes, cost_usd, created_at). Admin-only RLS.
- `daily_costs`: rolled-up daily snapshot across all 4 sources. Admin-only RLS.
- `cost_alerts`: log of alerts fired so we don't double-notify (alert_type, threshold, fired_at).

## Per-user attribution (user stories)
- As the founder, I want `/admin/costs` to show **top 20 users by 30-day spend** so I can spot whales (good or bad).
- As the founder, I want to drill into one user's row and see their breakdown (AI vs Deepgram, by session) so I understand what they're doing.
- As the founder, I want **anonymous/audience traffic** rolled up as a single "Anonymous" bucket so it doesn't crowd the table.

## Alerting (Budget + anomaly — locked)
**Budget alerts** (monthly, resets the 1st):
- 50% of $200 ($100): email — informational.
- 75% ($150): email — "watch trend."
- 90% ($180): email + push — "consider action."
- 100% ($200): email + push + in-app banner on `/admin/*` — "over budget."

**Anomaly alert** (daily):
- If today's spend > **3× the trailing 7-day average**, fire one alert.
- One-per-day cap to avoid spam.
- Trigger: pg_cron at 23:55 UTC computes day total → checks rule → enqueues email if triggered.

All alerts use `cost_alert` template (§16 essential bucket — founder always receives).

## /admin/costs page (founder-only, gated by `is_admin`)
- Header: current month spend / $200 budget with progress bar.
- 30-day stacked area chart: 4 sources color-coded.
- Top 20 users table: name, 30d spend, AI:Speech:Other split, last active.
- Anomaly log: any spike alerts fired in the last 30 days.
- "Export CSV" for accounting.

## Cron jobs
- **Daily snapshot** (pg_cron 00:10 UTC): rolls yesterday's per-call logs into one `daily_costs` row.
- **Budget check** (pg_cron 00:15 UTC): recomputes month-to-date, fires any new tier alerts.
- **Anomaly check** (pg_cron 23:55 UTC): same-day spike detection.

## Out of scope at launch
- Per-user hard caps or throttling (you chose to trust rate limits).
- Real-time cost dashboard (daily snapshot only).
- User-facing cost visibility ("you've used $X of AI this month") — internal only.
- Cost-aware model routing (e.g. auto-downgrade to cheaper model when over budget).
- Per-feature P&L breakdowns.
- Forecasting / projection charts (just historical).
- Multi-currency display.

## Acceptance checklist
- All 4 cost sources writing to their respective tables; verified by spot-checking 24h of `ai_usage_log` rows after a test session.
- `daily_costs` snapshot job runs and reconciles within 5% of provider dashboard totals for one full week.
- `/admin/costs` renders all 4 widgets without console errors; founder-only (non-admin gets 403).
- 50% / 75% / 90% / 100% alert thresholds tested by manually inserting historical rows; each fires exactly once per cycle.
- Anomaly alert tested: insert a synthetic 4× day → alert fires; reset → doesn't refire.
- Top-20-users table shows attribution including the founder's own test sessions.
- Cron jobs visible in Supabase dashboard with last-run timestamps.
