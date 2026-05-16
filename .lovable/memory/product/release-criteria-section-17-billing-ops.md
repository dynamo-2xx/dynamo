---
name: Release §17 Billing & Payments Ops
description: Pro tier live at launch on Lovable built-in Stripe, monthly-only, smart retries then downgrade.
type: feature
---

# §17 — Billing & Payments Ops

**Decisions locked by founder:**
- Pro tier is **live at launch** (waitlist-off requires working billing).
- Payments: **Lovable built-in Stripe** — no separate Stripe account, no API key to manage.
- Pricing model: **Monthly only.** No annual, no trial, no founding-member tier at launch.
- Failed payment: **Smart retries, then downgrade to Free.** Account + data preserved; just lose Pro limits.

**Still open — flagged for you:**
- **Exact monthly price (e.g. $8/mo, $12/mo, $20/mo).** I refuse to guess. Decide before stripe products are created.
- **What Pro unlocks vs Free.** §12 Monetization memory has draft tier limits but you've never confirmed them with me. Recommend a fresh ask_questions pass on §12 before §17 ships.

## Provider setup
- Enable via `payments--enable_stripe_payments` (Lovable-managed Stripe). Test mode immediately; live mode after Lovable account claim.
- No `STRIPE_SECRET_KEY` secret needed in this project.
- Domain link: `dynamo.today` (root) added to Stripe Checkout allowed origins.

## Product catalog (to create after enable)
- ONE recurring product: "Dynamo Pro" — monthly recurring.
- Price: **TBD (founder must decide before product creation).**
- Tax: full compliance handling (Stripe acts as merchant of record) — assuming US digital service eligibility. Confirm at enable time.

## Checkout flow (user stories)
- As a free user hitting a Pro-gated action, I want a clear upsell card explaining what Pro unlocks and a one-tap "Upgrade" button so I can subscribe in <30 seconds.
- As a checkout user, I want to land on Stripe Checkout (Lovable-managed), pay, and be returned to the in-app page that triggered the upgrade — not a generic /success page.
- As a Pro user, I want a "Manage subscription" link in `/settings/billing` that opens the Stripe Customer Portal so I can update card, view invoices, or cancel.

## Subscription state machine
- `profiles.subscription_status`: `free` | `pro_active` | `pro_past_due` | `pro_canceled` | `pro_grace`.
- Status transitions driven by Stripe webhooks (handled by Lovable's built-in webhook → mirrored into our table):
  - `checkout.session.completed` → `pro_active`.
  - `invoice.payment_failed` → `pro_past_due` (still has Pro access during retry window).
  - `invoice.payment_succeeded` after past_due → back to `pro_active`.
  - End of retry window (Stripe smart retries: 4 attempts over 21 days by default) → `pro_canceled` → downgrade to `free`.
  - User-initiated cancel → remains `pro_active` until `current_period_end`, then `free`.

## Failed-payment policy (Smart retries then downgrade — locked)
- Use Stripe's default smart-retry schedule (4 attempts, escalating intervals over ~21 days).
- **Emails sent during this window (§16 essential, override unsubscribe):**
  - Day 0 (first fail): `payment_failed` — "Your card was declined. We'll try again in 3 days."
  - Day 7: reminder — "Second attempt failed. Update your card in Settings → Billing."
  - Day 18: final warning — "Last attempt in 3 days. After that you'll move to the Free plan."
  - Day 21 (downgrade): `subscription_downgraded` — "Your card couldn't be charged. You're on Free now. Your account + data are safe."
- **In-app banner during past_due:** yellow strip on every page, "Payment issue — update your card", deeplink to Stripe Portal.
- **No suspension, no data loss.** Downgrade only enforces Pro-gated feature limits.

## Tax & invoicing
- Receipts: Stripe sends automatically on every successful charge. Branded with `mail.dynamo.today` sender (§16 `payment_receipt`).
- Tax handling: Stripe full-compliance mode (charges + remits on founder's behalf where eligible).
- Refunds: **Not self-serve.** User emails `billing@mail.dynamo.today`, founder issues via Stripe dashboard. No refund window committed in ToS at launch.

## Settings → Billing page (must exist before waitlist-off)
- Shows: current plan, status, next renewal date (if pro_active), payment method last 4 digits, "Manage in Stripe Portal" link, list of past invoices (link out).
- Free user: shows Pro feature list + "Upgrade" CTA.
- Past-due: red banner with "Update payment" CTA.

## Out of scope at launch
- Annual plan (revisit at 3 months if monthly churn signal is strong).
- Free trial period.
- Team / multi-seat Pro.
- Discounts / coupons / referral credits.
- Education and Civic tiers (mentioned in §12 — separate product, post-launch).
- Self-serve refunds.
- Proration on mid-cycle plan changes (no plan changes exist at launch — monthly only).
- In-app receipt history (link out to Stripe Portal).

## Acceptance checklist
- `enable_stripe_payments` complete, test mode confirmed working with test card 4242…
- ONE Pro product created at decided monthly price.
- Checkout flow round-trips: free user → upgrade → Stripe Checkout → returns to triggering page → status flips to `pro_active` within 30s.
- Stripe Customer Portal accessible from `/settings/billing`.
- Webhook handlers update `profiles.subscription_status` on all 4 lifecycle events; verified via test events.
- Payment-failed simulation triggers all 4 emails on schedule.
- Past-due banner renders sitewide while in that state.
- Downgrade enforces Free-tier limits (per §12) within 1 minute of state change.
- Tax displayed correctly on test checkout for US, UK, DE buyers.
- Refund flow documented in `docs/billing-runbook.md` for founder.
