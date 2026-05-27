## Plan

### 1. Header: collapsible "Facilitation" menu (publishers only)
In `src/pages/DebateRoomPage.tsx`, replace the current header `<PauseButton>` with a `<Popover>` triggered by a small `Facilitation` chip (Settings/Sliders icon + label), rendered only when `isPublisher` (`isCreator || isFacilitator`) and `!isCompleted`. Popover content stacks vertically:

- **Pause / Resume room** — room-wide host pause (writes `paused_at` on `debates`). When paused, label switches to `Resume room · m:ss` and the chip itself shows an amber dot so it's visible without opening.
- **Extend time** — calls existing `handleExtendTime`.
- **Skip turn** — existing `onSkipTurn`.
- **Next subtopic** — existing `onNextSubtopic`.

These handlers already exist on `DebateRoomPage` and are passed into `ParticipantSharedView`. Lift the wiring up: pass them into the new header menu instead (or keep them on the page and just call them from the popover, which lives on the page anyway).

### 2. Fix the room-wide pause so it actually pauses
The current top "Pause" used `usePauseControl`, which only stores `paused_at` and ticks an elapsed counter — it never freezes the turn clock. Fix: when the host toggles "Pause room" we must also stop the turn timer for everyone.

- On pause: call the existing `onToggleTimer` (if `timerRunning`) **and** write `paused_at` via `usePauseControl.pause()`. Persist `paused_at` so refresh restores the paused state.
- On resume: clear `paused_at` and restart the turn timer (`onToggleTimer` if `!timerRunning`).
- In `ParticipantSharedView` / `DebateRoomPage` timer effect, treat `debate.paused_at != null` as a hard block: do not advance `timeLeft`, do not auto-advance turns, and ignore Deepgram-driven turn ends. The existing "Paused by host" badge for non-hosts stays via `usePauseControl` read-only mode.
- Show the label as `Resume room · m:ss` where `m:ss` is the elapsed pause time from `pausedAt` — this is the "counts upward" behavior, but now correctly framed as *how long the room has been paused*, not a pretend timer.

### 3. Remove facilitator controls from the bottom panel
In `src/components/debate/ParticipantSharedView.tsx` (~lines 502–524), delete the publisher branch entirely: no more Pause/Resume, Extend, Skip Turn, Next Subtopic in the bottom row. The bottom row keeps only speaker-facing affordances.

Drop the now-unused `onExtendTime` / `onSkipTurn` / `onNextSubtopic` props from `ParticipantSharedView` if nothing else needs them (or keep the props but stop rendering — verify call sites). The header menu calls these directly from the page.

### 4. Speaker pause becomes a small icon button in the control row
In `ParticipantSharedView`, the bottom control row already has small icon-circle buttons for `d.` (FloatingIntelligence), Argument Map, and Notebook (the row visible in the screenshot near the composer). Add the speaker pause there as a fourth peer:

- Icon-only circle button (matching `IconCircleButton` styling used by the others), `Pause` icon when running, `Play` icon when paused.
- Visible only when `isSpeaker && isMyTurn && !isPublisher` (publishers pause via the header menu).
- Same 30s auto-resume safety + visible countdown already in step 3 of the prior plan: while paused, render a tiny countdown badge (`0:30 → 0:00`) next to or under the icon.
- One pause per turn: `pauseUsedThisTurn` ref resets on `(current_subtopic_index, current_turn, current_speaker_side_id)` change; once used, the button is disabled with tooltip "1 pause per turn used".

### 5. Mobile layout sanity
The Facilitation popover keeps the header from overflowing on narrow screens (884px and below). The chip itself is icon + short label; on `<640px` we can drop the label and show icon-only. Popover content is a single column so it never overlaps the transcript or composer.

### Files touched
- `src/pages/DebateRoomPage.tsx` — new Facilitation popover in header, wires Pause/Extend/Skip/Next; removes the bare `<PauseButton>`; ensures `paused_at` blocks the turn timer.
- `src/components/debate/ParticipantSharedView.tsx` — remove publisher control row; add speaker pause as a small icon button alongside d./map/notebook; countdown + one-per-turn guard.
- `src/components/sharing/PauseButton.tsx` — keep as-is for CMM / Live, but the debate room stops using it directly.

No DB / backend changes; `paused_at` and `usePauseControl` already exist. No changes to CMM or Live rooms.
