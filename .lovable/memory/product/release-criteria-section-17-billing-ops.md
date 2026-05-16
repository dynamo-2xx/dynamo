---
name: Release §17 Billing Operations
description: Stripe webhooks, dunning, receipts, refunds, proration, tax — the operational layer under §12 pricing.
type: feature
---

# §17 — Billing Operations

Scope boundary: **§12** owns tiers, prices, paywall surfaces, caps. **§18** owns unit costs and pricing inputs. **§17** owns everything that happens *after* a user clicks "Subscribe" — the plumbing that keeps Stripe + our DB in sync.

## Stripe integration
- **Stripe Checkout** (hosted) for subscription start. No custom card form at launch (PCI scope = SAQ-A).
- **Stripe Customer Portal** for plan changes, payment-method updates, cancellation, invoice history. Single button in `/settings/billing` opens portal session.
- Pro = single monthly recurring price (set by §12). Edu/Civic = sales-led, manual invoicing via Stripe Invoicing (no Checkout flow at launch).

## Webhook handler
- Edge function `stripe-webhook` (verify_jwt = false, signature-verified via `STRIPE_WEBHOOK_SECRET`).
- Idempotent: every event upserted into `stripe_events` by `event.id` before processing; replays no-op.
- Events handled:
  - `checkout.session.completed` → upgrade `profiles.tier` to `pro`, set `pro_since`, send `payment_receipt` email.
  - `customer.subscription.updated` → mirror status (`active`/`past_due`/`canceled`) into `profiles.subscription_status`.
  - `customer.subscription.deleted` → downgrade tier to `free` at period end; preserve content (no immediate cap enforcement on existing assets).
  - `invoice.payment_succeeded` → log to `billing_events`, email receipt.
  - `invoice.payment_failed` → kick off dunning (below).
  - `charge.refunded` → log; if full refund + within 7d of upgrade, downgrade immediately.
- All handlers complete <2s or enqueue follow-up; webhook returns 200 quickly to avoid Stripe retries.

## Data model
- `profiles.tier` enum: `free | pro | education | civic`.
- `profiles.stripe_customer_id`, `profiles.subscription_status`, `profiles.current_period_end`.
- `stripe_events` — id (Stripe event id, PK), type, payload jsonb, processed_at.
- `billing_events` — append-only user-facing log: user_id, kind, amount_cents, currency, invoice_url, created_at. Surfaced in `/settings/billing` history.

## Dunning (failed payment)
- Day 0: email `payment_failed` + in-app banner "Update payment method" linking to portal.
- Day 3: second email + push notification.
- Day 7: third email, "Subscription will lapse in 24h".
- Day 8: Stripe cancels (smart retries exhausted) → `subscription.deleted` → downgrade.
- During `past_due`: Pro features stay on (grace period).

## Refunds
- No self-serve refunds at launch. Founder issues from Stripe dashboard.
- Policy in ToS: 7-day no-questions-asked on first Pro charge; case-by-case after.
- `charge.refunded` webhook handles downgrade if applicable.

## Proration
- Stripe default: prorate on plan changes. At launch there's only one Pro tier so this only matters for cancellations mid-period (no refund, access until `current_period_end`).

## Tax
- Stripe Tax enabled. Auto-collects VAT for EU, GST for AU/IN/CA, US sales tax for required nexus states.
- Customer enters billing address in Checkout; Stripe handles registration thresholds.
- Tax IDs collectible in Customer Portal for B2B EU customers (reverse charge).
- Founder must register for EU OSS before any EU sale clears — gate flagged in launch checklist.

## Receipts & invoices
- Stripe-hosted receipts for every successful charge (link in `payment_receipt` email + `/settings/billing`).
- Edu/Civic: PDF invoices from Stripe Invoicing, NET-30 terms.

## Secrets
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` (test + live pairs via environment).

## Out of scope at launch
- Annual plans (deferred to post-launch; §12 may green-light earlier).
- Coupons / promo codes (Stripe supports, but no UI surface).
- Team/org billing (Edu uses manual seat invoicing).
- Crypto / alt payment methods.
- Self-serve refund button.
- Currency switching (USD only at launch).
- Affiliate / referral payouts (referral *credits* live in §11, not cash).

## Acceptance checklist
- Test-mode Checkout → upgrade → portal cancel → downgrade at period end, all reflected in `profiles.tier`.
- Webhook signature rejection on tampered payload.
- Idempotent replay of `checkout.session.completed` does not double-charge tier flag or re-send receipt.
- Failed-payment dunning sequence fires on simulated `invoice.payment_failed`.
- Stripe Tax shows VAT line for EU test address.
- `/settings/billing` shows correct status + opens Customer Portal.
- Refund in Stripe dashboard logs `billing_events` row and (if within 7d) downgrades.