---
name: Release Criteria — Section 8: Lifecycle Transitions
description: Round end grace, completion celebration overlay, live edit countdown, owner no-show auto-cancel
type: feature
---
# Section 8 — Lifecycle Transitions

Companion to `release-criteria-section-8-notifications.md` (push channels). This file covers in-session transitions and owner/participant edge cases.

## Story 1 — Round timer expires mid-sentence
**Decision: 5-second grace + chime, then auto-advance**
- At 0:00, soft chime plays + on-screen "Wrap up" pulse on the timer.
- 5-second countdown overlay (5… 4… 3…) lets active speaker finish their thought.
- At -0:05, hard auto-advance to next round/turn. No owner intervention required.
- Applies to Debate (turn timer) and CMM (challenge response timer). Live has no per-round timer.
- Transcript captures everything spoken during the grace window, attributed to the expiring round.

## Story 2 — Final round ends → completion overlay
**Decision: Celebration overlay with reactions, lingers until dismissed**
- Full-screen overlay with "Session complete" headline + Instrument Serif treatment.
- **Reactions row**: clap / insightful / changed-my-mind buttons — each participant taps one (optional). Tally shown live.
- **Personal grade card**: only shown if grading was enabled in session config (preserves Section 2 rule).
- **CTA**: "View Record →" primary button. Secondary: "Stay in room" (room becomes read-only chat for 5 min, then auto-closes).
- Overlay is dismissible but reappears on next visit until user clicks "View Record" or "Stay in room".
- Reactions feed into Record's social-proof header ("12 claps · 4 insightful").

## Story 3 — Live edit-window countdown
**Decision: Live countdown banner ("47h 12m left to edit…")**
- Banner pinned to top of Record for the owner only during the 48h window.
- Format: `Edits open · 47h 12m left` — updates every minute client-side, refetches on focus.
- At T-2h, banner color shifts to amber + push notification fires (already in notifications spec).
- At T-0, banner hides; record becomes immutable. New banner: "This record is locked."
- Participants (non-owner) see static text: "Owner can edit until [date]" — no countdown noise.

## Story 4 — Owner no-show
**Decision: Auto-cancel at start_time + 15 minutes**
- Grace clock starts at scheduled `start_time`. If owner has not joined by start_time + 15m, session enters `cancelled_no_show` status.
- All invitees receive push + in-app notification: "Session cancelled — owner didn't show. Reschedule?" with one-tap "Suggest new time" CTA that DMs the owner.
- Pre-cancel warnings: at +5m and +10m, waiting participants see banner "Owner not here yet — auto-cancels in Xm."
- Owner can override by joining anytime in the 15-min window; cancel is only triggered by `pg_cron` sweeper if owner truly absent.
- Cancelled sessions stay in owner's drafts (not hard-deleted) so they can re-publish with a new time.
- Slot reservations released; mic-prep state wiped.

## Schema additions queued
- `debates.status` enum gains `cancelled_no_show`.
- `debate_reactions` table: `(debate_id, user_id, reaction_type, created_at)` — clap/insightful/changed_mind enum.
- `pg_cron` sweeper: every 5 minutes, scan published debates where `start_time < now() - 15m AND owner_last_seen_at < start_time AND status = 'scheduled'` → mark `cancelled_no_show` + dispatch notifications.

## Implementation tasks queued
1. 5s grace overlay component reused across Debate + CMM round transitions.
2. Completion overlay with reactions + grade card; reaction RLS (insert own, read all participants).
3. Live countdown banner hook (`useEditWindowCountdown`) with focus-refetch.
4. `pg_cron` no-show sweeper + cancellation notification dispatcher.
5. "Suggest new time" DM template and reschedule deep-link.
