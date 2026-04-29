
## Goal

1. **Block "End Session" spamming** during transcript analysis with a real progress bar + disabled button.
2. **Resume a live session as a live session** (not as a debate). New entries appear after a clear "Resumed …" divider.
3. **Quick "Generate sequel" shortcut on debate / change-my-mind records.** This does NOT touch live sessions. Sequel = a brand-new debate (or CMM) that's a copy of the original, auto-titled `Original Title #2`, `#3`, etc. Saves the user a trip through the home page generator.

---

## Part 1 — Analysis progress bar (gates End Session)

Today, in `useLiveTranscription.endSession`:
- `disconnect()` → final `runAnalysis(true)` → mark session `ended`. The user sees only `isSummarizing: boolean`. End button stays clickable.

Changes:

- **Surface progress from the hook.** Add to the return:
  ```ts
  analysisProgress: {
    phase: "idle" | "classifying" | "summarizing" | "finalizing" | "done";
    current: number;  // batches finished
    total: number;    // batches total (classify + N summary batches + finalize)
    label: string;    // human-friendly
  }
  isEnding: boolean;
  ```
  - Replace `Promise.all(batches…)` with a sequential loop so we can bump `current` after each batch resolves.
- **Idempotent `endSession`.** Hold the in-flight promise in a ref; subsequent calls return that promise instead of starting a second pass. (Today `lastAnalyzedCountRef.current = 0` resets and a second click would re-run everything.)
- **`LiveSessionPage` UI**:
  - `<Progress>` bar pinned at the top of the recording view while `isEnding`.
  - End Session button: `disabled` while `isEnding`, label swaps to `Finalizing… (3/7)` with `aria-busy`.
  - Lightweight transparent overlay over the transcript so accidental taps don't fire other actions.

Files: `src/hooks/useLiveTranscription.ts`, `src/pages/LiveSessionPage.tsx`.

---

## Part 2 — Resume a live session (live → live)

The data already supports this — `live_sessions.transcript_entries` is JSONB and `useLiveTranscription` already loads it on mount. Only UX is missing.

### 2a. Continue button on ended sessions
- In `LiveSessionPage` when `status === "ended"`, render `SessionRecordView` plus a **"Continue session"** button in the header.
- Clicking it:
  1. Updates the row to `status = "recording"`, sets `resumed_at = now()`.
  2. Appends a synthetic divider entry to `transcript_entries`:
     `{ id: uuid, kind: "session_resume_marker", resumed_at, created_at }`.
  3. Switches `phase` back to `"recording"` and reconnects the mic.
- Each subsequent resume inserts another marker, so the timeline shows multiple "since last session" dividers in order.

### 2b. Render the dividers
- `LiveThreadView`, `SpeakerBubble`, `TranscriptPane`: small branch — when `entry.kind === "session_resume_marker"`, render a centered horizontal rule:
  *"Resumed Apr 28 · 2:14 PM — new entries below"*
  instead of a speaker bubble. Existing entry shape is preserved; the field is optional.

### 2c. "New since last visit" ribbon (owner-only)
- Add `live_sessions.last_viewed_at`. On mount of `SessionRecordView` (when `!readOnly`), find the first entry newer than `last_viewed_at` and render a soft "Read up to here" line above it.
- On unmount, write `now()`.
- In My Agenda Live tab, render a small `+N new` pill on the cover when `last_viewed_at < latest entry timestamp` (covers multi-device adds).

Files: `src/pages/LiveSessionPage.tsx`, `src/components/live/SessionRecordView.tsx`, `src/components/live/LiveThreadView.tsx`, `src/components/live/SpeakerBubble.tsx`, `src/components/live/record/TranscriptPane.tsx`, `src/pages/MyDebatesPage.tsx`.

---

## Part 3 — "Generate sequel" shortcut on Debate / Change My Mind records

Goal: from a debate (or CMM) record, one click → a brand-new debate (or CMM) that's a copy of the original, auto-titled `<Original Title> #2`. Doesn't touch the original. No AI required — pure structural copy, opening the existing CreateDebatePage editor pre-populated so the user can tweak before publishing.

### 3a. New RPC: `clone_debate(_source_id uuid) returns uuid`
- SECURITY DEFINER, gated on `can_view_debate(_source_id)`.
- Inserts a new `debates` row owned by `auth.uid()`:
  - Topic: `<original.topic> #N` where N = next available integer for that owner (count of existing debates whose topic matches `^<original.topic> #\d+$` or equals the original, +1, starting at 2 if none).
  - Status: `draft`.
  - Copies over: `format`, `time_per_turn`, `turns_per_subtopic`, `prep_time_min/max`, `max_speakers_per_side`, `topic_category`, `community_tag`, `institution_tag`, `is_public = false`, `feedback_enabled`, `grading_enabled`, `description`, `cover_image_url`, `mode`-equivalent fields, `facilitator_type`.
  - Copies `debate_sides` (preserving `label`, `sort_order`).
  - Copies `debate_subtopics` (preserving `title`, `sort_order`).
  - Copies `debate_tags`.
  - **Does not copy** participants, invitations, transcripts, arguments, grades, scheduled_at, or any runtime state.
  - Sets `source_record_type = 'debate'`, `source_record_id = _source_id` on the new row (new columns below).
- Returns the new debate id.

Same shape for `clone_change_my_mind(_source_id uuid)` — same RPC body works since CMM is a debate row with `format = 'change_my_mind'`. Implement as a single `clone_debate` RPC; format is auto-copied.

### 3b. Schema (one migration)
```sql
alter table public.live_sessions
  add column if not exists resumed_at timestamptz,
  add column if not exists last_viewed_at timestamptz;

alter table public.debates
  add column if not exists source_record_type text
    check (source_record_type in ('debate','change_my_mind')),
  add column if not exists source_record_id uuid;

create index if not exists debates_source_idx
  on public.debates (source_record_type, source_record_id);
```
No RLS changes needed; the new columns ride existing policies.

### 3c. UI entry points
- **Debate record page** (`DebateRoomPage` when status = `completed`, and the debate cover in My Agenda):
  Add a small **"Generate sequel"** button (icon: `Copy`). On click → call `clone_debate` → navigate to `/create?edit=<newId>` so the user lands in the existing edit flow with everything filled in and can adjust before going live.
- **Change My Mind record page** + cover: same button, same RPC, navigate to `/create-cmm?edit=<newId>` (or `/create?edit=<newId>` if CMM uses the same editor — verify on implementation).
- **Backlink chip** on the new debate inside the editor and the room: *"Sequel of <original title>"* linking to the source record. Read from `source_record_id`.

### 3d. Numbering rule (server side, inside the RPC)
- Strip an existing trailing ` #N` from `original.topic` to get the base.
- Find max N among the caller's debates whose topic is `base` or matches `^base #\d+$`.
- New topic = `base #<max+1>`, with `<max+1>` ≥ 2.

Files: new migration, `src/pages/MyDebatesPage.tsx` (sequel button on debate covers), `src/pages/DebateRoomPage.tsx` (sequel button when completed), `src/components/home/DebateCoverCard.tsx` if needed for the backlink chip.

---

## Out of scope

- Sequel from live sessions (explicitly excluded per your clarification).
- Multi-device "continue" coordination (purging stale presence rows). Single-device resume is fine for v1; for multi-device, resume just reopens the room and devices rejoin via the existing join code.
- AI-generated sequels (this version is a structural copy; AI generation is a separate future feature).
