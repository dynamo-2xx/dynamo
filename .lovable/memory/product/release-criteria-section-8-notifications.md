---
name: Section 8 — Notifications & lifecycle
description: Push channels, in-app surface, edit-window reminder, lifecycle dispatch wiring
type: feature
---

# Section 8 — Notifications & lifecycle

## Push channels (in addition to existing debate-start)
1. **Invite received** → push to invitee with Accept / Decline actions.
2. **Invite accepted/declined** → push to owner.
3. **Session about to start (T-5 min)** → push to all accepted invitees of scheduled sessions.
4. **Record published / 48h edit window opens** → push to owner + participants.
5. **Edit window T-2h reminder** → one-time push to owner before the 48h window closes.

(Existing) **Debate started** → push to INTERESTED? users via `dispatch-debate-start-push`.

## Quiet hours
- **Disabled.** Always send. Users mute via OS-level Do Not Disturb.

## In-app surface
- Bell icon → `/notifications` list (already built).
- **Plus**: ephemeral sonner toast on arrival via Realtime subscription to `notifications` table for `recipient_id = auth.uid()`. One toast per row, click opens `data.url`.

## Edit-window UX
- Banner stays on the record page for the full 48h window.
- T-2h reminder push fires once per record to the owner.

## Dispatch architecture
- Reuse `notifications` table + Web Push pipeline from `mem://features/debate-notify-and-push`.
- New scheduled edge function (pg_cron, every minute) `dispatch-lifecycle-push` scans:
  - `debates`/`live_sessions` with `scheduled_at` ∈ [now+4m, now+5m] and `t5_pushed_at IS NULL` → fire T-5.
  - `debates` with `edit_window_ends_at` ∈ [now+2h, now+2h+1m] and `t2h_edit_pushed_at IS NULL` → fire T-2h.
  - Mark `*_pushed_at` columns to ensure single-fire idempotency.
- Invite events fire from existing invitation RPCs / triggers (insert into `notifications` + call dispatch fn).
- Record-published push fires from a trigger on `debates.is_public` / `live_sessions.is_public` flipping to true.

## Schema additions (new columns)
- `debates`: `t5_pushed_at timestamptz`, `t2h_edit_pushed_at timestamptz`.
- `live_sessions`: `t5_pushed_at timestamptz`.

## Acceptance
- All 5 channels deliver to a test device with the app installed.
- Toast appears on arrival when app is foregrounded.
- T-5 and T-2h fire exactly once per record.
- Auto-advance, completion overlay, and archive transitions remain intact (no regressions).
