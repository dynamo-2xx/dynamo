

# Change My Mind — new debate format

A lightweight debate style where the **owner** publishes a topic + subtopics, and **anyone can queue up** to challenge them. Each challenger writes their own "side" (their position) when they queue. The owner then runs through challengers one-at-a-time, like a stack.

Mobile-first design. No turns/prep-time/timers config. Just: topic → AI subtopics → tags → public/private → owner's side → publish → queue forms → owner takes them on.

## How it differs from a normal debate

| Step | Normal Debate | Change My Mind |
|---|---|---|
| Setup categories | turns, time/turn, prep time, two sides, invites | **just** topic, subtopics, tags, public/private, owner's side |
| Sides defined | both sides up-front by owner | only **owner's side** up-front; challengers write theirs at queue-time |
| Participants | invited / fixed roster | open queue, anyone authenticated can join |
| Flow | structured turns alternating | owner vs. **current challenger** in a 1-v-1 round; pop next from queue |

## User flow (mobile-first)

### Owner: Create
1. Tap "Change My Mind" on the home Hero (new third slide alongside Debate / Live).
2. Step 1 — Prompt: "What do you want to be challenged on?" → AI generates subtopic suggestions.
3. Step 2 — Edit subtopics (reorder / add / remove, max 6, same UI patterns as `CreateDebatePage`).
4. Step 3 — **Your side**: single short text field ("My position…"), tags picker (max 5), public/private toggle. No turns / no prep / no time / no invites.
5. Tap "Publish" → routes to the live "Change My Mind" room.

### Challenger: Queue
1. Visits the public CMM room (`/cmm/:id`). Sees topic, subtopics, owner's side, and live queue.
2. Taps "Challenge" → bottom-sheet composer prompts: **"Your position (1–2 sentences)"** (required) + optional preferred subtopic.
3. Submits → appears in queue with status `waiting`. Can withdraw.

### Owner: Run the room
- Sees an **ordered queue** of challengers with their stated positions.
- Taps "Start" on the next challenger → that challenger becomes `active`; the room shows a 1-v-1 view (owner side vs. challenger side, with the challenger's stated position rendered as their side label).
- Both speak using the existing live-transcription pipeline (single-device by default; no rigid turns).
- Owner taps "End round" → challenger marked `completed`, next in queue is auto-promoted to `up_next`.
- Owner can `skip` or `kick` a challenger.

## Data model (single migration)

**`debates.format` enum-like text column** (default `'standard'`):
- `'standard'` — existing debate behavior, all current logic untouched.
- `'change_my_mind'` — new format. Skips turns/prep/sides-as-pair logic.

**`debate_sides`** is reused. For CMM, exactly one row is created at publish time: the **owner's side** (label = owner's stated position, sort_order 0). Challenger sides are inserted on-the-fly when their turn starts.

**New table `cmm_queue`:**

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `debate_id` | uuid | references debate (FK enforced via RLS, like other tables) |
| `user_id` | uuid | the challenger |
| `position_text` | text | challenger's stated side, ≤ 280 chars |
| `preferred_subtopic_id` | uuid \| null | optional |
| `status` | text | `waiting` \| `active` \| `completed` \| `skipped` \| `withdrawn` |
| `queue_index` | int | append-on-insert (max+1), used for ordering |
| `started_at` / `ended_at` | timestamptz | |
| `created_at` | timestamptz default `now()` |

Unique partial index on `(debate_id, user_id) WHERE status IN ('waiting','active')` so a user can't double-queue.

**RLS on `cmm_queue`:**
- `SELECT`: `can_view_debate(debate_id)` (existing helper covers public + owner + participant cases).
- `INSERT`: `auth.uid() = user_id AND can_view_debate(debate_id) AND debates.format = 'change_my_mind'`. Validation trigger blocks self-queue by owner and enforces ≤280-char position_text.
- `UPDATE`: requester can only update own row to set `status = 'withdrawn'`. Owner (via `debates.created_by = auth.uid()`) can transition any row to `active`/`completed`/`skipped`.
- `DELETE`: requester owns row, only when `status = 'waiting'`.

**RPCs (SECURITY DEFINER):**
- `cmm_join_queue(_debate_id uuid, _position text, _preferred_subtopic uuid)` → inserts the row at `MAX(queue_index)+1`, returns the new row.
- `cmm_start_next(_debate_id uuid)` → owner-only; promotes next `waiting` row to `active`, sets `started_at`, creates a `debate_sides` row for the challenger (sort_order = next), inserts a `debate_participants` row for the challenger as a speaker on that new side, and updates `debates.current_speaker_side_id` to the challenger's side.
- `cmm_end_round(_debate_id uuid, _outcome text)` → owner-only; marks active row `completed`/`skipped`, sets `ended_at`. Returns the next waiting row (or null).

**Realtime:** add `cmm_queue` to `supabase_realtime` so the queue updates live for owner and challengers.

## Routes & files

- **New** `src/pages/CreateChangeMyMindPage.tsx` — 3-step setup (prompt → subtopics → side+tags+visibility). Reuses `TagPicker`, `DynamoLoader`, the AI `generate_debate` action (we'll add a `format: 'cmm'` hint server-side that asks for subtopics only and skips turns/time).
- **New** `src/pages/ChangeMyMindRoomPage.tsx` — single mobile-first screen:
  - Top: topic + subtopic chips, owner's side card.
  - Middle: live transcript (reuses the single-device `useLiveTranscription` pipeline).
  - Bottom (mobile sticky): "Challenge" CTA for visitors, or "Start next / End round / Skip" controls for the owner.
- **New** `src/components/cmm/QueueList.tsx` — ordered list of pending challengers showing avatar, name, and stated position. Owner sees action buttons; visitors see "You are #N in queue" if they've queued.
- **New** `src/components/cmm/ChallengeComposer.tsx` — bottom-sheet (mobile) / dialog (desktop) form for `position_text` + optional preferred subtopic. Auth-gated; opens `AuthPromptDialog` if signed out.
- **Edit** `src/components/home/HeroActionShazam.tsx` — add a third slide:
  `{ id: "cmm", label: "Change My Mind", description: "Open a topic. Take on every challenger.", icon: Swords, route: "/cmm/new" }`.
- **Edit** `src/App.tsx` — add routes `/cmm/new` (protected) and `/cmm/:id` (public/protected).
- **Edit** `supabase/functions/ai-facilitator/index.ts` — extend `generate_debate` to accept `payload.format = 'change_my_mind'`; in that mode, return only `topic` + `subtopics` (skip `sides`, `turns_per_subtopic`, `time_per_turn`).

## Out of scope

- Multi-challenger / panel mode (only 1-v-1 owner vs. challenger at a time).
- AI moderation of the queue (no auto-rejection of low-quality positions).
- Grading / round-summary AI for CMM rounds in this pass — basic transcript only.
- Email invites — CMM is open-queue by design.
- Editing a published CMM topic's subtopics (matches normal debate behavior — locked once live).

