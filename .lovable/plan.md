## Goals

Fix seven debate-flow defects so audio reliably becomes transcript, the Argument Map is a real threaded record, every side has constant access to their tools, the Preparation Window uses the current Notebook + Argument Map, turn-end always syncs both sides, joiners route through mic-prep, and the debate generator can send invites before publish.

---

## 1. Audio → Transcript (Debate Room)

**Bug**: Deepgram connects and shows interim text but final statements never persist. Root cause: `useDeepgramTranscription` only activates when `deepgramActive` toggle is true (`DebateRoomPage` line 298). The user expects audio capture as soon as the debate is live for the active speaker.

**Fix**:

- Drop the manual `deepgramActive` toggle gate. Activate transcription automatically whenever `debate.status === "live"` AND `canSpeak` is true (the user is the active speaker on their turn). Keep a small mic on/off control on the toolbar for explicit mute.
- Add a guard log when `flushStatement` fires with empty buffer; verify `statementSideRef.current` is populated (it was previously set to empty string when `currentSpeakerSide` was `""`). Default to `currentSide?.label || sides[0]?.label`.
- Confirm `persistTranscriptEntries` upsert succeeds; surface errors via toast in dev only.

---

## 2. Argument Map — true Threaded Record

**Bug**: `ArgumentMapOverlay`'s "Threaded Record" tab is a flat transcript with no subtopic structure or argument-analysis grouping.

**Fix** — rebuild `ArgumentMapOverlay` with two tabs:

1. **Threaded Record**: collapsible per **subtopic** → collapsible per **thread** → cards built from `argumentMap` entries (which already carry `type: claim | counter | stake | quote | evidence` and `parent_index`). Use the same hierarchical pattern as `ThreadedRecordPane`. Each card shows the AI-derived summary plus its `type` flag (rebuttal/concession/etc.) as a chip. Threads are derived by walking `parent_index` chains within a subtopic.
2. **Transcript**: collapsible per subtopic, listing every `TranscriptEntry` ordered by timestamp with side label.

Pass `transcriptEntries` and `argumentMap` (from `useDeepgramTranscription`) plus `subtopics` to the overlay. `analysis` prop becomes derived metadata for chip labels, not the primary content.

---

## 3. Annotations on user content

**Need**: User can highlight any user-generated text — in the main display, in the Argument Map overlay, in the Transcript tab — and create an annotation.

**Fix**:

- `DebateHighlightLayer` is already mounted at the root. Add `data-annotatable` to every text-bearing block inside the rebuilt `ArgumentMapOverlay` (both tabs) and in `MessengerChat` bubbles so the existing selection layer picks them up.
- Confirm the highlight layer's selection capture works inside `FloatingOverlay` (z-index and pointer-event check); if not, raise the overlay's selection capture surface.

---

## 4. Control Panel always available to both sides

**Bug**: In `ParticipantSharedView`, the d./Argument Map/Notebook buttons live inside `{canSpeak && ...}` blocks (lines 289, 324, 456) so only the actively-speaking side sees them.

**Fix**:

- Move the control trio (d. / Argument Map / Notebook) out of `canSpeak` gates. Render for any user where `isSpeaker === true` (i.e., either side), on every screen size. They open overlays that are read-only/editable regardless of turn.
- The d. moderation button stays interactive for both sides (it's already content-agnostic).
- Mic button stays gated by `canSpeak` (only the active speaker can broadcast).

---

## 5. Preparation Window — new Notebook + Argument Map

**Bug**: `PrepPhaseOverlay` has a left "Prior turn transcript" box and a right single `<textarea>` "My Notes" — both outdated.

**Fix**:

- **Left column** → embed the new `ArgumentMapOverlay`'s content inline (without the floating frame): same two tabs (Threaded Record + Transcript), filtered to the full debate so prep users can review everything.
- **Right column** → embed the current Notebook UI used in the main room: tabs for **My Thoughts**, **Annotations**, **My Take**, **Dynamo**, backed by `useSessionNotebook` and `useSessionAnnotations` (same hooks `NotebookOverlay` uses). Same rich-text surfaces.
- Drop `lastTranscript` / `lastAiSummary` props; the embedded Argument Map covers prior-turn review.
- Outgoing-role "edit AI summary" step keeps its existing two-column layout but the right column also becomes the Notebook (summary editor moves into a small banner above the workspace).

---

## 6. End-My-Turn-Early sync

**Bug**: Visitor side clicking "End turn early" sometimes doesn't push the host side into the prep window — they stay in the live view.

**Root cause**: `endTurnEarly` → `enterPrepPhase` writes `prep_phase_active = true` with the guard `.eq("prep_phase_active", false)`. When the previous prep cycle's realtime update hasn't reset the local DB row, the write silently drops. Plus the realtime handler's `enterPrepPhaseFromRealtime` only fires once `prepPhaseRoleRef.current` is null — if a prior state lingered, the other side never enters prep.

**Fix**:

- In `enterPrepPhase`, on update conflict, retry without the guard after a short delay; log the conflict.
- In the realtime handler for `debates` updates: always re-evaluate `updated.prep_phase_active` and call `enterPrepPhaseFromRealtimeRef.current(updated)` whenever it flips true, even if a stale local `prepPhaseRoleRef` is set — clear and re-enter so both sides land in the same prep room.
- Add a watchdog: when a side that just ended their turn writes prep, after 2s if the other side's `debate.prep_phase_active` hasn't propagated, force a `debates` SELECT refresh to recover from a missed realtime tick.

---

## 7. Mic-Preparation phase on join

**Bug**: After queueing into a debate, users aren't sent through the mic-prep step.

**Audit**:

- `JoinDebatePage` already renders `MicTestStep` before navigating into the room — good.
- `DebateLobbyPage` (owner pre-live) renders `MicLobby` — good.
- The gap: in `JoinDebatePage` line ~191 (`if status === "live", hand off and navigate`), users who land mid-live skip the mic-test. Also the "publish → join" path can jump straight into the room.

**Fix**:

- In `JoinDebatePage`, always require `MicTestStep` completion before allowing handoff/navigation, regardless of debate status. Show a single-step modal "Test your mic" if status is already `live`.
- After the publisher publishes (`CreateDebatePage` `handleCreateDebate(true)` → `navigate(/explore/...)`), if the publisher is also a speaker, route them to `/debate/:id/lobby` first so they go through `MicLobby` instead of jumping to Explore.

---

## 8. Pre-publish "Send Invites" button in debate generator

**Need**: In `CreateDebatePage`, when the user has added invitees but hasn't published yet, give them a button that sends invitations immediately (debate stays as a draft / scheduled record).

**Fix**:

- Add a secondary action **"Send invites now"** next to the publish action. Disabled when `invitedEntries.length === 0`.
- On click: run the same invitations block that currently lives inside `handleCreateDebate` (lines ~863–940) — create draft debate if not yet saved, write `debate_invitations` rows, invoke `send-invite-email` for email entries — but **do not** flip status to `scheduled`/`live`. Toast "Invitations sent. Publish when ready."
- After sending, keep the user on the generator so they can keep editing before publish.

---

## Files

**Edit**

- `src/hooks/useDeepgramTranscription.ts` — fix speaker-side default; tighten persist logging.
- `src/pages/DebateRoomPage.tsx` — drop `deepgramActive` gate; sync logic for prep-phase realtime; mic-prep routing post-publish.
- `src/components/debate/ArgumentMapOverlay.tsx` — rebuild with subtopic-grouped Threaded Record + Transcript tabs; `data-annotatable` everywhere.
- `src/components/debate/ParticipantSharedView.tsx` — ungate control panel from `canSpeak`.
- `src/components/debate/PrepPhaseOverlay.tsx` — embed new Argument Map + Notebook instead of single-textarea.
- `src/pages/JoinDebatePage.tsx` — mandate `MicTestStep` even when status is `live`.
- `src/pages/CreateDebatePage.tsx` — extract invitations block; add "Send invites now" button.

**New**

- `src/components/debate/PrepArgumentMapPanel.tsx` — inline (non-floating) wrapper that reuses the Argument Map tabs for prep window.
- `src/components/debate/PrepNotebookPanel.tsx` — inline wrapper around the same hooks as `NotebookOverlay` (My Thoughts / Annotations / My Take / Dynamo) for prep window.

No DB migrations required.

---

## User stories

- **As a speaker**, my spoken words appear in the transcript automatically as soon as my turn starts and I enable my microphone.
- **As either side**, I can open the Argument Map at any time — including while the other side is speaking — and see a real threaded record grouped by subtopic with rebuttal/concession flags, plus a clean transcript tab. Exactly as demonstrated in the preview of a published debate and the completed record.
- **As a debater**, I can highlight any text in the room (main view, argument map, transcript) and annotate it.
- **As a debater preparing my turn**, the prep window gives me the full Argument Map on the left and my full Notebook (Thoughts / Annotations / My Take / Dynamo) on the right.
- **As the visiting side**, when I end my turn early the host side is instantly pulled into the same prep window, keeping us on one timer.
- **As a joiner**, I always go through mic-prep before entering the room, even if I joined mid-live.
- **As a publisher**, I can send invitations to my picked invitees before I publish the debate.