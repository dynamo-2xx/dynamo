---
name: Release Criteria — Section 5: Data Safety (RLS)
description: Privacy walls, deletion grace period, guest profile retention, mod safety net for clubs
type: feature
---
# Section 5 — Data Safety (RLS)

Communicated via user stories. All decisions below are RLS / lifecycle rules, not UI.

## Story 1 — Stranger peeking at a private debate
**Decision: Soft wall — "Private debate, request access"**
- Unauthenticated or non-invited users hitting a private debate URL see: title + owner display name + a "Request access" CTA. No transcript, no participant list, no record content.
- Request creates a row owner sees in their notifications + a row in `debate_invitations` (or new `debate_access_requests` table) in `pending` state. Owner approves → invitation is upgraded to accepted, user joins as audience/spectator by default.
- RLS: extend `can_view_debate` to permit a *metadata-only* read path (title + owner) for any authenticated user via a new SECURITY DEFINER helper `can_preview_debate(debate_id)`; full content remains gated by existing `can_view_debate`.

## Story 2 — Ex-participant when owner deletes a debate
**Decision: 48-hour grace window before hard delete**
- Owner clicks "Delete" → debate enters `pending_deletion` status with `deletion_scheduled_at = now() + 48h`. Stays publicly visible during the window with a banner: "This debate will be permanently deleted in Xh — download your contributions now."
- All participants receive a push + in-app notification at deletion start AND at T-2h (reuses Section 8 dispatcher).
- Anyone with view access can download their personal transcript contributions (and the full record if public) during the 48h window.
- After 48h, `pg_cron` job hard-deletes the debate row and ON DELETE CASCADE wipes participants, arguments, transcripts, grades, invitations, interests, notify subscriptions, queue entries.
- Owner can cancel deletion within the window (status → `completed` or prior status, banner removed).

## Story 3 — Guest profile retention after session ends
**Decision: Full guest profile retained until host deletes**
- Temp guest profiles (created by host for no-device, no-account participants) persist after session end with their host-chosen display name + transcript attribution intact.
- Host has a per-session "Guest profiles" management list: rename, merge into a real account (if guest later signs up and host approves), or purge (which anonymizes their transcript entries to "Guest" and deletes the profile).
- Guests are session-scoped: a guest profile created in Session A cannot be reused in Session B; host must create a new one.
- No IP, device fingerprint, or other identifying metadata stored on guest profiles — only host-chosen display name + optional avatar.
- RLS: guest profile rows readable to anyone who can view the session; only the host can update/delete.

## Story 4 — Rogue moderator in a Club
**Decision: Mods can delete, but 48h owner recovery window + audit log**
- Destructive mod actions (delete debate, remove member, delete event, change club settings, remove tags) are soft-deletes: row gets `deleted_at` + `deleted_by` set, hidden from normal queries.
- All mod actions write to a new `club_audit_log` table (action type, actor, target, before/after snapshot, timestamp). Owner-only readable.
- Owner sees a "Recently deleted" tray in club admin with a single-click "Restore" for each item within 48h.
- After 48h, `pg_cron` hard-deletes soft-deleted rows.
- Owner role itself is immutable by mods (existing rule preserved).

## Schema additions (next migration)
- `debates`: `deletion_scheduled_at timestamptz`, status enum gains `pending_deletion`.
- `clubs/club_events/club_members/club_tags`: `deleted_at timestamptz`, `deleted_by uuid`.
- New `debate_access_requests` table OR extend `debate_invitations` with a `requested_by_user` flag.
- New `club_audit_log` table.
- New SECURITY DEFINER `can_preview_debate(debate_id)` helper.
- `pg_cron` job: hourly sweeper for `pending_deletion` debates past `deletion_scheduled_at` and soft-deleted club rows past 48h.

## RLS principle
- SELECT for full content stays gated by `can_view_debate` / `can_view_club`.
- Preview path (title + owner only) is a separate, narrower helper — never relax existing policies.
- Soft-deleted rows are filtered in `can_view_*` helpers so they vanish from normal queries but remain owner-recoverable.