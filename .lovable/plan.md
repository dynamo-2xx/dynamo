# Debate happy-path: bugs + UX cleanup

Feedback first, then a per-fix user story and confidence rating, then a tight implementation outline. No code changes yet — this is the plan.

## Feedback on the asks

All requests are coherent and consistent with the existing memory:

- The two pause buttons are a real layering bug — they bind to two different concepts (host/facilitator session pause vs. speaker turn-timer pause) but are drawn next to each other with the same icon and label, so users can't tell them apart.
- The two share buttons are a leftover from before `ShareDialog` (co-ownership) was added — the room now shows both the old "invite/join-code" popover and the newer co-ownership dialog. Splitting them by lifecycle (live → invite, completed → co-ownership) is the right call.
- The post-session record showing "Summaries pending." and a Pause button is a regression — `DebateRoomPage` renders the same top chrome regardless of `status`, and the completed-state record is reading from a different summaries source than the live argument map.
- Argument-map truncation is purely a layout cap (`truncate` + narrow column).

## Why there are two Pause buttons today

- **Top-right "Pause" (`<PauseButton kind="debate">`)** — wired to `usePauseControl`, which writes `debates.paused_at`. It is broadcast over Realtime and halts transcription + the round clock for everyone. This is the **facilitator/host pause** with no time limit.
- **Inline "Pause" inside `ParticipantSharedView` control row** — calls `onToggleTimer`, which only pauses the local turn timer for the current speaker. This is the **speaker pause** and should be capped (per your ask) at 30s before auto-resume.

User stories:

- *Facilitator pause:* "As the host, I want to pause the whole room indefinitely (e.g., projector failure, side-bar dispute) so transcription, the round clock, and AI all stop until I resume."
- *Speaker pause:* "As the active speaker, I want a short breather (≤30s) without losing my turn, after which my clock auto-resumes so I can't stall the debate forever."

---

## Fixes, user stories, confidence

### 1. Lobby — Start debate doesn't promote queued speakers; no rejoin path

**User story:** "As a queued speaker, when the host hits Start I want to be pulled into the live room on my chosen side automatically; if I navigated away from the lobby, I can rejoin from the debate preview with a single tap."

**What's broken:** `handleStart` in `DebateLobbyPage` only flips `status → live`. Queued `debate_interests` rows are never converted into `debate_participants`, so `DebateRoomPage`'s participant gate rejects them. `DebateScheduledPreviewPage` switches off the "Queue to join" CTA once `status === 'live'`, leaving queued users with no rejoin button.

**Plan:**

- In `handleStart` (and `handleForceStart`), before the status flip, fetch all `debate_interests` rows for this debate where `role = 'queued_speaker'` and insert matching `debate_participants` rows (`user_id`, `side_id` from the interest, `participant_role = 'speaker'`). Idempotent upsert on `(debate_id, user_id)`.
- Realtime listener in `DebateScheduledPreviewPage` already redirects to the room; once promoted, the room will accept them.
- For rejoin: when `status === 'live'` AND the current user has a `queued_speaker` interest OR is already a `debate_participants` row for this debate, show a **"Rejoin live debate"** button on the preview page that routes straight to `/debate/:id`.

**Confidence:** High (8/10). Pure read-then-insert plus one CTA branch. Risk is duplicate-key handling on rapid double-clicks — covered by upsert.

### 2. Live debate room — dedupe top chrome, integrate facilitator pause

**User story (host):** "I see exactly one Pause control in the header that pauses the whole session, and exactly one Share control that opens invite/join links — no duplicates."
**User story (speaker):** "My turn-pause sits in the bottom control panel where my other turn controls are, and auto-resumes after 30 seconds."

**Plan:**

- In `DebateRoomPage` header (lines 1280–1330): **remove** the `<ShareDialog>` (Link2 icon — co-ownership belongs to the post-session record only) when `status !== 'completed'`. Keep the existing Share2 invite popover and **add a third tab inside it called "Invite directly"** that wraps `<InviteFriendsDialog>` (already exists) so the host can pick a user and send an in-app invite without leaving the popover.
- Keep `<PauseButton>` at the top — relabel its tooltip to **"Facilitator pause (whole room)"** so it's distinguishable.
- The bottom **speaker turn-timer Pause** stays where it is (`ParticipantSharedView` row at line 309). Add a 30s cap: when `onToggleTimer` pauses, start an internal 30s timeout that calls `onToggleTimer` again to resume; show a small "(30s max)" hint under the button while paused.
- Always render the bottom control panel — currently it only renders during a speaker's own turn; gate the *send/extend/skip* sub-actions on `isMyTurn`, but keep Pause/timer visible for the active speaker every turn.

**Confidence:** High (8.5/10). UI rewiring + one timeout. The "always show control panel" change needs a quick visual pass to make sure non-speakers don't see speaker-only controls.

### 3. Argument map — wider thread text, threads collapsed by default

**User story:** "When I open Insights → Argument map, each subtopic stays open so I can scan the threads, but the threads themselves are collapsed — I expand the one I care about, and the thread title gets a full line instead of cutting off at 30 characters."

**Plan (in `ArgumentMapContent.tsx`):**

- Change inner-thread `<Collapsible ... defaultOpen>` (line 139) → `defaultOpen={false}`.
- On the thread trigger row (line 140), drop `truncate` from the title `<p>` and switch to `line-clamp-2` so titles can wrap to two lines.
- Audit the overlay width — `ArgumentMapOverlay` currently caps the panel narrowly. Bump its max-width so the thread column gets ~480px instead of ~360px on desktop.

**Confidence:** Very high (9.5/10). Pure CSS/prop tweaks.

### 4. Post-session record — strip live-only chrome, fix "Summaries pending."

**User story:** "When the debate is over, the record page shows the same threaded argument map I saw live, with all summaries intact. There's no Pause control (nothing to pause), and the only Share button is the co-ownership Share (Link2 icon)."

**Plan:**

- In `DebateRoomPage` header, hide `<PauseButton>` and the live-invite Share2 popover when `debate.status === 'completed'`. Show `<ShareDialog>` (Link2) instead — this is the co-ownership share.
- "Summaries pending." in screenshot 3 comes from the completed-state record reading from `debate_round_summaries` while the live argument map read from a different cache. Verify the post-session view (`DebateRecordPreview` / completion overlay path) pulls from the same `useDebateThreads`/`subtopics_summary` source the live `LiveArgumentMapAI` used; if a separate fetch exists, replace it so both views render identical data. If summaries genuinely weren't persisted (some were AI-side only), trigger a one-shot finalize on `status → completed` that writes the live in-memory summaries to the persisted table — but the first hypothesis (data source mismatch) is the more likely root cause.

**Confidence:** Medium-High (7/10). Header gating + Share swap is trivial. The "Summaries pending" fix needs one round of verification — I'll need to read both the live and completed-state argument-map data hooks before committing to the exact fetch swap; if the summaries were truly never persisted we add a tiny finalize step.  
If possible, directly apply the post-session fixes to /debate/1ac9d890-0c3f-4ae3-b770-4e706c120deb in which I can verify immediately.

---

## Technical summary (files touched)

- `src/pages/DebateLobbyPage.tsx` — promote queued interests into `debate_participants` inside `handleStart`/`handleForceStart`.
- `src/pages/DebateScheduledPreviewPage.tsx` — add "Rejoin live debate" CTA when status is live and user is queued/participant.
- `src/pages/DebateRoomPage.tsx` — status-gated header: live = Share2 popover + facilitator Pause; completed = `ShareDialog` only, no pause. Add "Invite directly" tab inside the Share2 popover.
- `src/components/debate/ParticipantSharedView.tsx` — keep speaker Pause in the bottom control row across all turns; enforce 30s auto-resume.
- `src/components/debate/ArgumentMapContent.tsx` + `ArgumentMapOverlay.tsx` — threads collapsed by default, line-clamp-2 titles, wider panel.
- Completed-state argument map: confirm and unify the data source with the live map (read-only investigation first, then a small swap).

No DB migration needed unless the summaries-persistence root cause turns out to be missing writes — in that case a small edge-function call on completion, not a schema change.  
  
