---
name: Release §18 Cost Tracking & Spend
description: Per-feature unit costs, spend dashboards, and the pricing-decision queue that gates §12 numbers.
type: feature
---

# §18 — Cost Tracking & Spend

Owns all unit-economics work: measuring what each feature costs to run, surfacing spend to the founder, and producing the inputs §12 needs to set Pro price + Free caps.

## Pricing-decision queue (blocks launch)
Inputs required before §12 can publish prices and Free caps:

1. **Per-feature unit costs**
   - Deepgram: cost per minute of transcription (Debate vs Live endpointing profiles).
   - Gemini / Lovable AI Gateway: token spend per AI call type — DYNAMO facilitator turn, record Q&A message, live deep-pass dashboard, notebook consolidation, cross-ref detection.
   - Supabase: storage GB-month (transcripts, notebooks, OG cache, avatars/banners), egress per session view, edge-function invocations.
   - Web Push send cost (negligible but track).
   - Stripe fees per Pro transaction (base + any tax-handling surcharge from §12 enable step).

2. **Pro monthly price** — set after cost pass + target margin. Founder decision.

3. **Free caps** — sessions/mo, notebooks total, AI calls/mo. Tuned so a typical evaluating user hits the paywall around day 7.

4. **Edu/Civic per-seat price ranges** — sales talk-track only, no public price page.

## Cost dashboards (founder-only at launch)
- `/admin/costs` page — daily spend per provider (Deepgram, Lovable AI, Supabase, Stripe), 30-day trend.
- Per-user cost rollup — top 50 users by inferred cost (sessions × avg-duration × rates).
- Alert thresholds: email founder when daily spend exceeds configurable cap.
- No user-facing cost surfacing at launch.

## Data model
- `usage_events` — append-only log: `user_id`, `provider`, `metric` (e.g. `deepgram_minutes`, `gemini_tokens_in`, `gemini_tokens_out`), `quantity`, `session_id?`, `created_at`. Written by edge functions on each call.
- `daily_spend_rollup` — pg_cron nightly: per-provider, per-day totals + estimated USD.
- Rate constants live in a single config table (`cost_rates`) so founder updates rates without a deploy.

## Out of scope at launch
- Per-user cost surfacing in product UI.
- Cost-based throttling beyond §12 paywall caps.
- Multi-currency cost reporting.
- Cost forecasting / ML projections.

## Dependencies
- §10 (PostHog) — usage events double as analytics; cost events stay in DB only.
- §12 (Monetization) — consumes pricing outputs.
- §21 (Performance Intelligence) — heaviest AI consumer; deep-pass cost most sensitive to model choice.
