---
name: Release §16 Email & Transactional Comms
description: Auth emails, invites, digests, unsubscribe, deliverability infra (SPF/DKIM/DMARC).
type: feature
---

# §16 — Email & Transactional Comms

## Provider
- **Resend** as ESP at launch (already used by `send-invite-email`).
- Single sending domain: `mail.dynamo.today`. Marketing/auth/transactional all share it at launch; can split later.
- All templates rendered server-side in edge functions (React Email components in `supabase/functions/_shared/email/`).

## Deliverability infra (must pass before waitlist-off)
- SPF: `v=spf1 include:_spf.resend.com -all` on `mail.dynamo.today`.
- DKIM: Resend-provided CNAMEs published.
- DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@dynamo.today; pct=100`.
- BIMI: deferred (requires VMC cert).
- Verified with `mail-tester.com` ≥9/10 and Google Postmaster Tools enrolled.

## Email types at launch
| Template | Trigger | From | Reply-to |
|---|---|---|---|
| `auth_verify` | signup | `no-reply@mail.dynamo.today` | none |
| `auth_magic_link` | passwordless / recovery | `no-reply@` | none |
| `auth_password_reset` | forgot password | `no-reply@` | none |
| `invite_debate` | owner invites to debate/cmm/live | `invites@mail.dynamo.today` | inviter's profile-masked address |
| `invite_accepted` | invitee accepts | `notifications@` | none |
| `club_join_approved` | admin approves request | `notifications@` | none |
| `report_acknowledged` | reporter submits | `safety@mail.dynamo.today` | safety@ |
| `sanction_notice` | moderation action | `safety@` | appeal@ |
| `appeal_decision` | appeal resolved | `safety@` | none |
| `weekly_digest` | Sun 10am user-local | `digest@mail.dynamo.today` | none |
| `payment_receipt` | Stripe webhook success | `billing@mail.dynamo.today` | billing@ |
| `payment_failed` | dunning (§17) | `billing@` | billing@ |

## Auth emails
- Supabase Auth SMTP configured to Resend (already documented in onboarding-v2 prerequisites).
- Custom HTML templates uploaded via Supabase auth dashboard — branded with DYNAMO wordmark + black/white palette.
- Magic-link / reset links land on `/auth/callback` with single-use token.

## Weekly digest
- pg_cron Sundays 14:00 UTC → enqueues per-user digest jobs respecting `profiles.timezone` to land near 10am local.
- Content (only if non-empty for that user): debates you were invited to, records published by people you follow, club events this week, your unread DM count.
- Suppress entirely if user inactive >30d (deliverability hygiene).

## Preferences & unsubscribe
- `profiles.email_prefs` jsonb: `{transactional: true (locked), invites: true, weekly_digest: true, club_updates: true, safety: true (locked)}`.
- Every non-locked email contains one-click List-Unsubscribe header (RFC 8058) + visible unsubscribe link to `/settings/email`.
- `/settings/email` mirrors prefs; toggling persists immediately.
- Bounced + complained addresses auto-flipped to suppression list via Resend webhook → `email_suppressions` table; suppresses all future sends except `auth_*` and `safety_*`.

## Localization
- EN-only at launch (§14). Templates structured with `t()` keys ready for future locales.

## Out of scope at launch
- Drip/onboarding sequences beyond verify.
- Re-engagement campaigns.
- Push-to-email fallback.
- A/B subject-line testing.
- BIMI logo verification.

## Acceptance checklist
- DNS records green in Resend dashboard.
- mail-tester ≥9/10 on each template type.
- Postmaster Tools shows spam rate <0.1% over 7d post-launch.
- Every template renders in Gmail/Apple Mail/Outlook web (manual smoke).
- Unsubscribe link round-trips and persists.
- Suppression list blocks subsequent non-critical sends within 1 send cycle.