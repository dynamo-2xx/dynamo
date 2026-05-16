---
name: Release §16 Email & Transactional Comms
description: Auth, invites, safety, digest, billing, club emails via Lovable Emails on mail.dynamo.today.
type: feature
---

# §16 — Email & Transactional Comms

**Decisions locked by founder:**
- Provider: **Lovable Emails (built-in)**. No third-party ESP account, no Resend/Brevo/Mailgun API key.
- Sending domain: **mail.dynamo.today** (subdomain — keeps root domain reputation isolated).
- Email types at launch: **Everything** — auth, invites, safety, weekly digest, billing receipts, club updates.
- Unsubscribe: **Simple** — single global toggle for non-essential mail. Auth + safety always send.

## Provider setup (Lovable Emails)
- Configure via Lovable Cloud → Emails → set domain `mail.dynamo.today`. DNS records (SPF, DKIM, DMARC) provisioned automatically by Lovable.
- DNS verification must show green in Cloud → Emails before waitlist flips off.
- Auth email templates: scaffold via Lovable's auth-email-hook, branded per `mem://style/branding` (Instrument Serif headings, DM Sans body, monochrome).
- Transactional templates: scaffold via Lovable's `send-transactional-email` edge function pipeline. Templates live in `supabase/functions/_shared/email-templates/`.

## Email types at launch
As user stories:

| Template | User story |
|---|---|
| `auth_verify` | As a new signup, I want a verification link so that I can prove my email and unlock gated actions. |
| `auth_magic_link` | As a returning user, I want a one-tap signin link so that I don't need a password. |
| `auth_password_reset` | As a user who set a password, I want a reset link so that I can recover access. |
| `invite_debate` | As an invitee, I want to see who invited me and what session, so that I can accept/decline confidently. |
| `invite_accepted` | As an inviter, I want to know when someone accepts, so that I know my session is filling. |
| `club_join_approved` | As an applicant, I want to know my club request was approved, so that I can start participating. |
| `club_event_announced` | As a club member, I want to know about new events, so that I don't miss them. |
| `report_acknowledged` | As a reporter, I want confirmation my report was received, so that I trust the safety pipeline. |
| `sanction_notice` | As a sanctioned user, I want to know what happened and how to appeal, so that I have due process. |
| `appeal_decision` | As an appellant, I want the outcome in writing, so that I have a record. |
| `weekly_digest` | As a user, I want a Sunday recap of what I missed, so that I stay engaged without checking the app daily. |
| `payment_receipt` | As a paying user, I want receipts for tax/expense purposes. |
| `payment_failed` | As a paying user with a failed card, I want a warning before I lose access (§17 dunning). |

## Weekly digest
- pg_cron Sundays 14:00 UTC → enqueues per-user jobs respecting `profiles.timezone` to land near 10am local.
- Content (only if non-empty): debates you were invited to, records published by people you follow, club events this week, unread DM count.
- Suppress entirely if user inactive >30 days (deliverability hygiene).

## Unsubscribe behavior (Simple — locked)
- `profiles.email_prefs` jsonb: `{essential: true (locked), marketing: true}`.
- **Essential (always send, cannot be turned off):** auth, safety, invites you're a participant in, billing receipts, payment-failed.
- **Marketing (single toggle):** weekly digest, club event announcements (when you're a member, not when you're invited), invite-accepted notifications.
- Every marketing email contains a footer "Unsubscribe" link to `/settings/email` (one-click confirm, no extra screen).
- One-click List-Unsubscribe header (RFC 8058) included on marketing mail so Gmail/Apple Mail honor it.
- Bounced + complained addresses auto-flipped to suppression via Lovable Emails webhook → `email_suppressions` table; suppresses all future sends except essential.

## Localization
- EN-only at launch (carried from §14). Templates structured for future locales (`t()` keys ready).

## Out of scope at launch
- Per-category granular toggles (single marketing toggle only — that's the "Simple" decision).
- Drip/onboarding sequences beyond auth verify.
- Re-engagement campaigns for inactive users.
- A/B subject-line testing.
- BIMI logo verification.
- Reply handling (all senders are no-reply at launch).

## Acceptance checklist
- Cloud → Emails shows `mail.dynamo.today` green (SPF, DKIM, DMARC verified).
- All 13 templates above render correctly in Gmail web, Apple Mail iOS, Outlook web (manual smoke).
- Auth verify lands within 30 seconds on Gmail/Apple/Outlook test inboxes.
- Unsubscribe link round-trips: clicking it flips `marketing` to false and suppresses next digest within one cycle.
- Bounce + complaint suppression confirmed by sending to known-bad test address.
- Weekly digest cron fires Sunday and respects per-user timezone.
- Banned/suspended user (§15) still receives `sanction_notice` (essential override).
- mail-tester.com score ≥9/10 on each template type.
