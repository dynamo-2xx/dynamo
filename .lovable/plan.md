

# Change My Mind — revised plan

Adds invites, a grading toggle, and pre-live editability on top of the previously approved CMM plan. Everything else (open queue, owner-only side up-front, AI subtopics) stays the same.

## What's new vs. the previous plan

1. **Invites** — owner can pre-invite specific users (in addition to the open queue) so they get notified and skip the cold discovery step.
2. **Grading toggle** — at creation time, owner chooses whether AI grading runs on each round (off by default to keep CMM lightweight).
3. **Pre-live editability** — a published CMM stays editable (topic, subtopics, owner's side, tags, public/private, invites, grading) until the **first challenger round starts**. Once `started_at` is set, it locks (matching standard debate behavior).

## Creation flow (mobile-first, 3 steps)

1. **Prompt** → AI generates subtopics (no turns / no prep / no time).
2. **Subtopics** → reorder / add / remove (max 6).
3. **Your side + settings**:
   - "My position…" (single text field)
   - Tags (max 5)
   - Public / private toggle
   - **Invite people** (optional): username search → adds to invite list (reuses `InviteFriendsDialog` pattern, single-side variant)
   - **Enable AI grading** toggle (default OFF) — when on, runs `grade_turn` after each completed round and `grade_final` per challenger when their round ends
   - Publish

## Pre-live edit mode

- Route `/cmm/:id` detects `status = 'published' && started_at IS NULL` and renders an **"Edit setup"** banner for the owner.
- Owner can:
  - Edit topic, subtopics, owner's side label, tags, public/private
  - Add/remove invites
  - Toggle grading
  - Delete the CMM
- Challengers can still queue during this window — their queue rows persist through edits.
- The moment the owner taps **Start next** for the first time, `started_at` is set and the edit banner disappears (locked).

## Invites behavior

- Reuses existing `debate_invitations` table (already debate-scoped, has token + notification path).
- For CMM, invitation `side_id` is left NULL (challengers define their own side at queue time).
- On accept: invitee lands directly in `/cmm/:id` with the **Challenge** composer pre-opened.
- Notification: standard `debate_invitation` notification + email (existing `send-invite-email` function).

## Grading toggle

- New column `debates.grading_enabled boolean default false`.
- Creation UI exposes a Switch ("AI grading — each round gets scored privately").
- Room logic: when owner taps **End round**:
  - If `grading_enabled = true` → call `ai-facilitator` `grade_turn` for both owner and challenger; on the *last* round per challenger also `grade_final` for that challenger.
  - If `false` → skip entirely. No badge, no narrative.
- Grades remain owner-private + speaker-private (existing `debate_grades` RLS already enforces this).

## Data model deltas

Single migration adds:

- `debates.format text default 'standard'` — `'standard' | 'change_my_mind'`.
- `debates.grading_enabled boolean default false`.
- `cmm_queue` table (as previously specified): `id`, `debate_id`, `user_id`, `position_text` (≤280), `preferred_subtopic_id`, `status` (`waiting|active|completed|skipped|withdrawn`), `queue_index`, `started_at`, `ended_at`, `created_at`. Unique partial index on `(debate_id, user_id) WHERE status IN ('waiting','active')`.

RLS on `cmm_queue`:
- SELECT: `can_view_debate(debate_id)`.
- INSERT: `auth.uid() = user_id AND can_view_debate(debate_id)` and trigger blocks owner-self-queue + enforces 280 char cap.
- UPDATE: requester → own row only to set `withdrawn`; owner → any row to `active|completed|skipped`.
- DELETE: requester owns row when `waiting`.

RPCs (SECURITY DEFINER): `cmm_join_queue`, `cmm_start_next` (sets `debates.started_at` if null on first call → triggers lock), `cmm_end_round`.

Realtime: add `cmm_queue` to `supabase_realtime`.

## Files

- **New** `src/pages/CreateChangeMyMindPage.tsx` — 3-step setup including invite picker + grading switch.
- **New** `src/pages/ChangeMyMindRoomPage.tsx` — single screen; renders **EditSetupBanner** when `started_at IS NULL` for the owner, otherwise the live 1-v-1 view.
- **New** `src/components/cmm/EditSetupPanel.tsx` — inline pre-live edit form (topic, subtopics, side, tags, visibility, invites, grading).
- **New** `src/components/cmm/QueueList.tsx` — ordered challengers, owner controls.
- **New** `src/components/cmm/ChallengeComposer.tsx` — bottom-sheet (mobile) / dialog (desktop) for `position_text`.
- **New** `src/components/cmm/InvitePeoplePanel.tsx` — username search + chip list (lightweight wrapper that reuses `InviteFriendsDialog` patterns without its 2-side logic).
- **Edit** `src/components/home/HeroActionShazam.tsx` — third slide: Change My Mind (`Swords` icon, `/cmm/new`).
- **Edit** `src/App.tsx` — routes `/cmm/new` (protected), `/cmm/:id` (mixed).
- **Edit** `supabase/functions/ai-facilitator/index.ts` — `generate_debate` accepts `payload.format = 'change_my_mind'`; returns only `topic` + `subtopics`.

## Out of scope

- Multi-challenger / panel mode.
- AI moderation of queued positions.
- Editing a CMM **after** the first round starts (locked, like standard debates).
- Subscription gating for grading (uses existing global limits).

