# §18 Founder Cost Dashboard — Implementation Plan

## What we're building
A founder-only `/admin/costs` page with per-source budget tracking, revenue goal, Free/Pro user attribution tables, and stacked progress bars. Gated by hardcoded `FOUNDER_USER_ID`.

## Database changes (migration)
1. **`founder_settings`** (singleton)
   - `budget_ai_usd` (default 100), `budget_speech_usd` (60), `budget_cloud_usd` (30), `budget_stripe_usd` (10)
   - `monthly_revenue_goal_usd` (nullable)
   - `updated_at`
   - RLS: only FOUNDER_USER_ID can SELECT/UPDATE

2. **`ai_usage_log`** (per-call ledger)
   - `user_id`, `session_id`, `function_name`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `created_at`
   - Admin-only RLS

3. **`speech_usage_log`** (per-session ledger)
   - `user_id`, `session_id`, `minutes`, `cost_usd`, `created_at`
   - Admin-only RLS

4. **`daily_costs`** (rolled-up daily snapshot)
   - `date`, `source` (ai|speech|cloud|stripe), `cost_usd`, `created_at`
   - Admin-only RLS

5. **`cost_alerts`** (deduplication log)
   - `alert_type`, `threshold`, `fired_at`
   - Admin-only RLS

## Edge functions
- `log-ai-usage` — called by existing functions (ai-facilitator, analyze-transcript, record-qa, consolidate-notebook, detect-cross-refs) to write `ai_usage_log` rows
- `log-speech-usage` — called on Deepgram session end to write `speech_usage_log`
- `export-account-data` — built in §19 (out of scope for this plan)

## Frontend
- New page: `src/pages/AdminCostsPage.tsx`
- Route: `/admin/costs` in `App.tsx`
- Guard: 404 if `auth.uid() !== FOUNDER_USER_ID`

**Layout:**
```
Top row (side-by-side):
  [Cost progress bar]  [Revenue progress bar]
    - Editable budgets via inline pencil → modal
    - Color: green (<50%), amber (50-90%), red (>90%)

Stacked below:
  [AI bar] [Speech bar] [Cloud bar] [Stripe bar]
    - Each editable, same color rule
    - Total = sum of 4 sources

Two-table row (side-by-side):
  | Free Users              | Pro Users                |
  | name, 30d spend,        | name, 30d spend,         |
  | AI calls, speech min,   | AI calls, speech min,    |
  | debates, live, last     | debates, live, last, MRR |
  | active                  | contribution             |
  | Pagination 25/page      | Pagination 25/page       |

Below tables:
  - 30-day stacked area chart (4 sources)
  - Anomaly log (last 30 days)
  - Export CSV buttons (per table)
```

## Wiring existing functions
- `ai-facilitator` → POST to `log-ai-usage` with token/cost data
- `analyze-transcript` → same
- `record-qa` → same
- `deepgram-token` → on mint, log session start; on session end, POST to `log-speech-usage`

## Cron jobs (out of scope for code, just schema)
- `daily_costs` rollup at 00:10 UTC
- Budget check at 00:15 UTC
- Anomaly check at 23:55 UTC
- These will be configured in a follow-up after the schema is live

## Acceptance criteria
- `/admin/costs` renders without console errors
- Non-founder gets 404
- Budget editing saves and recomputes bars live
- Free/Pro tables populate from real usage data

## Not in this plan
- Per-user cost caps (founder chose none)
- Real-time dashboard (daily snapshot only)
- Cost-aware model routing
- Forecasting charts
- §19 export edge function or deletion flow
- §20 legal pages
