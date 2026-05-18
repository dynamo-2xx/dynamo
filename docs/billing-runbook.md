# Billing runbook (§17)

Founder-facing reference for Pro subscription operations. Keep terse — this
is the page you'll re-read at 2am when a customer emails about a charge.

## Provider
- **Lovable built-in Stripe** (no separate Stripe account or API key).
- Domain link: `dynamo.today` is on Checkout allowed origins.
- Currency: USD. Monthly only. Stripe is merchant of record (tax handled).

## Subscription state machine
`profiles.subscription_status` mirrors Stripe via webhook:

| Stripe event | App state |
|---|---|
| `checkout.session.completed` | `pro_active` |
| `invoice.payment_failed` (in retry window) | `pro_past_due` |
| `invoice.payment_succeeded` after past_due | `pro_active` |
| End of retry window (4 attempts / ~21d) | `pro_canceled` → `free` |
| User-initiated cancel | stays `pro_active` until `current_period_end`, then `free` |

## Dunning emails (§16, override unsubscribe)
| Day | Template | Trigger |
|---|---|---|
| 0 | `payment_failed` | first failed charge |
| 7 | `payment_failed_reminder` | 2nd attempt failed |
| 18 | `payment_failed_final` | last attempt warning |
| 21 | `subscription_downgraded` | retry exhausted, moved to Free |

## Refunds
No self-serve. User emails `billing@mail.dynamo.today`. Founder issues from
Stripe dashboard. Document reason in `billing_events.notes`.

Default stance:
- **Within 7 days of charge, no usage of Pro features** → full refund.
- **Service outage > 24h that affected the user** → prorated credit.
- **Otherwise** → decline politely and offer to cancel auto-renew.

## Customer Portal
Self-serve actions: update card, view invoices, cancel. Link from
`/settings/billing` → "Manage in Stripe".

## Manual interventions
- **Comp a Pro month**: Stripe dashboard → customer → Add coupon (100% off, 1
  month). Webhook will update state automatically.
- **Force-downgrade abuser**: Stripe dashboard → cancel subscription
  immediately. State will flip on next `customer.subscription.deleted` event.
- **Recover after webhook misfire**: re-fire the event from Stripe dashboard
  → Developers → Webhooks → Send test webhook.

## Acceptance smoke test (re-run after any billing change)
1. Free user upgrades with test card `4242 4242 4242 4242` → lands back on the
   page that triggered Upgrade → `subscription_status = pro_active` within 30s.
2. Past-due simulation (`tok_chargeDeclinedAfterAttach`) → yellow sitewide
   banner appears → Day-0 email lands in inbox.
3. Customer Portal opens from `/settings/billing` for Pro user.
4. Refund issued via Stripe dashboard → `billing_events` row appears within
   60s with `event_type = refund`.