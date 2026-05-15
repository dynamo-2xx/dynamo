---
name: Release §12 Monetization & Payments
description: Tier matrix, Stripe integration, paywall enforcement, and pricing-decision queue for launch.
type: feature
---

# §12 — Monetization & Payments

## Tiers at launch
All four ship day one: **Free, Pro, Education, Civic**.

- **Free** — default on signup. Hard caps (sessions/notebooks/AI calls TBD after cost pass).
- **Pro** — self-serve Stripe checkout. **Monthly only** at launch (annual deferred).
- **Education** — **sales-led only**. Public pricing page shows "Contact us" CTA → form → founder reviews → manual Stripe invoice + seat provisioning.
- **Civic** — **sales-led only**, same flow as Education. Verified gold seal (§Civic Features) tied to active Civic subscription.

## Payment provider
**Stripe (Lovable built-in / `enable_stripe_payments`)**. No BYOK. Tax handling decision deferred to enable step (§Step 5 of payments workflow); default to **full compliance handling** (`managed_payments`) for digital-only catalog when seller-country eligible.

## Billing model
- Monthly subscription only.
- No trials, no lifetime, no annual at launch.
- Grandfathering: waitlist-invited users get **no** automatic Pro — they enter Free like everyone else (invite credits are the early-access perk, not paid features).

## Paywall enforcement — HARD
Free users are **blocked at the limit**, not nudged. Pattern:
- At N+1 attempt (create session, create notebook, hit AI quota, etc.) → modal blocks the action.
- Modal shows: usage bar at 100%, "Upgrade to Pro" primary CTA → Stripe Checkout, "Maybe later" secondary.
- No mid-session interruption: if a Free user is *already in* a live session, they finish it. Block fires only on the next *create*.
- Caps reset monthly on subscription anchor day (Free uses signup-anniversary date).

## What Pro unlocks vs Free
1. **Higher limits** — all Free caps removed or significantly raised (exact numbers in pricing pass).
2. **Performance Intelligence (§21)** — toggle-based color/face filter on transcripts, post-session deep-pass dashboards, Dynamo handoff. Free tier sees **blurred preview** only.
3. No other exclusive features at launch. Clubs, OG cards, custom domains stay Free.

## Education / Civic activation (sales-led v1)
- `/pricing` page lists all 4 tiers; Edu/Civic CTAs route to `/contact-sales?tier=education|civic`.
- Form collects: org name, contact, seat count, use case.
- Submission creates `sales_lead` row → email founder → founder replies + sends Stripe invoice manually.
- On payment, founder runs admin tool to (a) create org record, (b) provision N seats, (c) flip Civic verification flag if applicable.
- No self-serve seat management UI at launch — founder manages via admin console.

## Data model (new)
- `subscriptions` — `user_id`, `tier` ('free'|'pro'|'education'|'civic'), `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`, `cancel_at_period_end`.
- `usage_counters` — `user_id`, `period_start`, `sessions_created`, `notebooks_created`, `ai_calls`, etc. Reset monthly via pg_cron.
- `sales_leads` — `org_name`, `contact_email`, `tier_requested`, `seat_count`, `use_case`, `status`, `created_at`.
- `org_seats` (post-launch): for now, Edu/Civic users get individual Pro-equivalent accounts tagged by founder.
- All tables: RLS — users see only their own subscription/usage; admins see all.

## Stripe edge functions
- `create-checkout` — Pro upgrade entry point.
- `customer-portal` — manage payment method / cancel.
- `stripe-webhook` (`verify_jwt = false`) — subscription lifecycle → updates `subscriptions` table.

## Paywall surfaces (where the hard block fires)
- Create Debate / CMM / Live (count toward `sessions_created`).
- Create Notebook from session (count toward `notebooks_created`).
- AI calls beyond cap (DYNAMO facilitator, record Q&A, deep-pass analysis) — exact metric per cost pass.
- Performance Intelligence dashboards (Free = blurred preview, Pro = full).

## KPIs (PostHog per §10)
`paywall_hit`, `upgrade_modal_shown`, `checkout_started`, `subscription_created`, `subscription_canceled`, `sales_lead_submitted`.

## Pricing inputs
Pro monthly price, Free caps, and Edu/Civic seat ranges are **owned by §18 (Cost Tracking)**. §12 consumes those numbers once the cost-modeling pass completes; it does not own them. See `mem://product/release-criteria-section-18-cost-tracking`.

## Out of scope at launch
- Annual billing.
- Free trials of Pro.
- Per-seat Edu/Civic self-serve.
- Lifetime / founder pricing.
- Coupon codes (post-launch).
- Affiliate / referral payouts (§11 invite credits ≠ revenue share).
- In-app receipts UI beyond Stripe Customer Portal link.
- Dunning emails beyond Stripe defaults.

## Secrets required (added at enable-payments step)
Lovable-managed Stripe injects keys automatically; no manual `add_secret` needed.
