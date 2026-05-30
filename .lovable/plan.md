## What I'll fix

### 1. Notebook design asymmetry (My Take "Suggest" missing + consolidate to one UI)

**Desired outcome:** The notebook looks identical everywhere it appears (debate room, record preview, post-session record, prep window). The "Suggest from my Thoughts + Annotations" button on the My Take tab works everywhere. `/my-study/:notebookId` is untouched.

**Root cause:** `MyTakeTab` only renders the Suggest button when it receives `recordType` + `recordId`. The shared `NotebookPanel` never passes those down. `SessionRecordViewV2` also never passes `recordType`/`recordId` to `NotebookPanel`. Two old, divergent components still exist: `NotebookOverlay.tsx` (dead) and `PrepNotebookPanel.tsx` (used inside prep) — both are raw `<textarea>` versions with no Suggest, no tabs parity, no Dynamo.

**Changes:**
- `NotebookPanel`: pass `recordType` + `recordId` into `MyTakeTab` in `renderTab`. Result: Suggest button appears in every consumer of `NotebookPanel`.
- `SessionRecordViewV2`: pass `recordType="live_session"` + `recordId={sessionId}` to its `NotebookPanel` so live-session notebooks also get Suggest.
- `PrepNotebookPanel`: replace its body with `NotebookPanel` mounted in inline (non-floating) mode so the prep window shows the exact same UI as the room and record. (Add a small `inline` prop to `NotebookPanel` that renders the contents without the fixed-position chrome / drag header, since prep already has its own column container.)
- Delete `src/components/debate/NotebookOverlay.tsx` (no remaining importers).

### 2. Debate-room notebook should drag across the entire screen

**Desired outcome:** The floating notebook can be dragged anywhere in the viewport, not clipped to the room's main panel.

**Status:** `NotebookPanel` already uses `position: fixed` with viewport-bound clamping, so positionally it can go anywhere. The visible "clipping" the user is seeing is the drag-bounds math using `size.w/size.h` against `window.innerWidth/innerHeight`, which is correct. I'll audit at runtime — most likely cause is an ancestor in `DebateRoomPage` with a CSS `transform`/`filter` that creates a containing block for `position: fixed`. If found, hoist the panel out via a portal to `document.body` so it truly floats over the entire screen.

**Change:** Wrap the desktop branch of `NotebookPanel`'s return in `createPortal(..., document.body)`. No layout regressions because it's already `position: fixed; z-index: 50`.

### 3. Facilitator pause must pause the preparation-window timer

**Desired outcome:** When the facilitator presses Pause during a prep window, the prep countdown freezes; Resume continues from where it left off.

**Change:** In `PrepPhaseOverlay`, read `isPaused` + `pausedAt` from `usePauseControl` (same hook the room already uses) and:
- Stop decrementing the local countdown while `isPaused` is true.
- When resumed, recompute remaining time as `original_remaining − (resume_time − pause_time)`.
- Suppress the auto-mark-ready-at-zero side-effect while paused.

No DB schema change — `paused_at` already exists on `debates`.

### 4. Invited speakers stuck in mic-prep lobby after host starts

**Desired outcome:** When the host flips the debate to `live`, every queued/accepted speaker in the lobby is auto-navigated into `/debate/:id` within ~2s. The "Waiting for host to start…" copy disappears.

**Investigation summary:** Both `DebateLobbyPage` and `JoinDebatePage` subscribe to `postgres_changes` on `debates` and navigate on `status === 'live'`. The fact this fails for some users points to either (a) the `debates` table not being in the `supabase_realtime` publication, or (b) the realtime subscription racing the page mount (the user landed *before* the channel was ready, then the host flipped status, then the channel attached too late).

**Changes:**
- Migration: ensure `debates` table is part of `supabase_realtime` publication (`ALTER PUBLICATION supabase_realtime ADD TABLE public.debates` — no-op if already there) and set `REPLICA IDENTITY FULL` so the `payload.new` row is complete.
- Add a poll-fallback in `DebateLobbyPage`, `JoinDebatePage`, and `WaitingForHost`: every 4s while in waiting phase, `select status from debates where id = :id`; if `live`, navigate. Belt + suspenders so realtime gaps never strand a user.
- Audit `LiveLobbyPage` + `CmmLobbyPage` for the same gap and add the same poll fallback.

## Verification

- Build passes.
- Visit debate room → open notebook → My Take tab → see "Suggest from my Thoughts + Annotations" button.
- Drag notebook into a corner of the screen previously unreachable; confirm it follows the cursor edge to edge.
- Start a debate, hit Pause during prep → prep timer stops; Resume → prep timer resumes.
- Two-browser test: host on /lobby, invited speaker on /lobby → host clicks Start → speaker navigates to /debate/:id within ~4s even if realtime is laggy.

## Confidence

- Notebook unification + Suggest: **95%** — wiring change with a clear root cause.
- Free-drag (portal): **80%** — depends on confirming a `transform` ancestor; portal is the safe catch-all.
- Pause during prep: **90%** — reuses existing hook + a small timer guard.
- Lobby auto-launch: **75%** — realtime publication + poll fallback should cover every case; final confirmation needs the two-browser test.
