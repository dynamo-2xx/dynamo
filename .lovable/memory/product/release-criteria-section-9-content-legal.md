---
name: Release Criteria — Section 9: Content & Legal
description: Terms presentation, civic seal transparency, account deletion semantics, and reporting/moderation flow for v1
type: feature
---

# Section 9 — Content & Legal

## Story 1 — Terms & Privacy presentation
**Decision**: Inline acknowledgment at signup.
- Below the "Create account" / "Continue with Google" buttons: small DM Sans 12px muted copy: "By continuing you agree to our [Terms] and [Privacy Policy]."
- Links open in new tab. No modal, no checkboxes, no scroll-gate.
- Footer also carries Terms / Privacy links globally.
- Acceptance is logged server-side: `profiles.tos_accepted_at`, `profiles.tos_version` on first session.

## Story 2 — Civic verification transparency
**Decision**: Short on profile + dedicated `/seals` page covering ALL seal types.
- **Profile placement**: Gold civic seal renders next to display name. Tooltip on hover/tap: "Verified civic figure. Tap for details." Links to `/seals#civic`.
- **Dedicated page** `/seals` covers:
  - **Civic** (gold): elected/appointed/declared candidate, verified via public records. No endorsement.
  - **Local** (regional accent): verified residency or work tied to a city/region — used in Civic discovery.
  - **Club** (club accent): verified leadership role within a Dynamo club (owner/moderator).
- Each seal section: visual swatch, who qualifies, how we verify, removal/appeal policy, contact email for corrections.
- Page is statically rendered, no auth required, indexable for press inquiries.

## Story 3 — Account deletion
**Decision**: 30-day grace, then hard delete account. Contributions are anonymized and remain unless the user individually deleted them while active.
- **Trigger**: Settings → Account → "Delete account" → confirm modal (re-enter email).
- **Day 0**: Account marked `pending_deletion`, login disabled, sessions revoked, profile hidden from search/discovery, push notifications off. Email sent: "Your account will be permanently deleted on [date]. Sign in before then to cancel."
- **Day 0–30 grace**: Single sign-in attempt → "Cancel deletion?" prompt restores account fully.
- **Day 30 sweep** (`pg_cron`):
  - `auth.users` row deleted.
  - `profiles` row deleted.
  - All transcript entries, debate participations, live contributions, club posts authored by user are **retained** but `author_user_id` nulled and display name replaced with "Former member". Avatar removed.
  - Records the user owned (debates, clubs, events) are NOT auto-deleted — those require explicit per-record action by the user before deletion or are transferred/orphaned per existing policy.
- **Important**: deleting account ≠ deleting their records. Records require individual task-completion by owner/admin.

## Story 4 — Reporting bad behavior
**Decision**: Per-message report → manual moderation queue (founder reviews v1).
- **Entry point**: Long-press (mobile) or kebab menu (desktop) on any transcript card, live entry, or club post → "Report".
- **Report modal**: Reason dropdown (Personal attack, Harassment, Hate speech, Spam, Misinformation, Other) + optional 280-char note + Submit.
- **Storage**: New `reports` table — `id`, `reporter_user_id`, `target_kind` (transcript_entry|live_entry|club_post|profile), `target_id`, `reason`, `note`, `status` (open|reviewed|actioned|dismissed), `created_at`, `reviewed_at`, `reviewer_user_id`.
- **Queue UI**: Internal-only `/admin/reports` route gated by `has_role('admin')` — list view with filters, item preview, and actions (Dismiss / Hide content / Suspend user / Ban user).
- **Reporter feedback**: Toast "Report received. Our team will review it." No status updates pushed back to reporter in v1.
- **No auto-suspend** in v1 — all decisions are human.
- **Block** is NOT included in v1 (defer to later release).

## Schema additions queued
- `profiles.tos_accepted_at TIMESTAMPTZ`, `profiles.tos_version TEXT`
- `profiles.deletion_requested_at TIMESTAMPTZ`, `profiles.deletion_scheduled_for TIMESTAMPTZ`
- `reports` table (above) with RLS: insert by any authenticated user, select/update by admin role only.
- `pg_cron` daily sweeper for hard-delete at day 30.

## Implementation tasks
- Inline ToS line on auth screen + acceptance write on first session.
- `/seals` static page with three sections (Civic, Local, Club) and tooltip on profile seals.
- Account deletion flow: settings UI, confirm modal, cancel-on-login, cron sweeper with anonymization.
- Report modal component, kebab/long-press menu integration, `reports` table + RLS.
- `/admin/reports` queue UI gated by `has_role('admin')`.

## Acceptance criteria
- ToS acceptance recorded with version stamp on every new account.
- `/seals` page reachable from any seal tooltip and from footer.
- Deletion request immediately disables login and sets `deletion_scheduled_for = now() + 30d`.
- After hard delete, no PII remains in `auth.users` or `profiles`; contributions show "Former member".
- Reporting any content writes a row to `reports`; admin queue lists it within 5s.
