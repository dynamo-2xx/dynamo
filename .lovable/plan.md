## Goal

Make the in-progress live session look like the debate room: a right-side **Argument Map** with two tabs — `Transcript` (avatar + name + mm:ss inline) and `Threaded Record` (anatomy + relationship tags driven by the structural AI pass). Fix the "Speaker 0" label when the host is alone, and add the green-check voice-confirmation to the live mic toggle.

Everything else in the live room (Zoom layout, themes, header, pause, end) is unchanged.

## Changes

### 1. Right pane → real Argument Map (Transcript / Threaded Record tabs)

In `src/pages/LiveSessionPage.tsx`, replace the current `transcriptBlock` (collapsible subtopic list with `LiveThreadView`) with the same component the debate room uses: `ArgumentMapContent`, wrapped in a small tab switcher.

- Add local state `mapTab: "transcript" | "threaded"` (default `transcript`).
- Render a sticky header with two tab buttons, the entry count, and the existing "Analyzing…" spinner.
- Build the inputs `ArgumentMapContent` expects from the live data we already have:
  - `subtopics` → `{ id: title, title }[]` from `subtopics`.
  - `transcriptEntries` → map each `LiveTranscriptEntry` to
    `{ id, speaker_side: getSpeakerName(speaker_id), text, subtopic: e.subtopic ?? subtopics[0] ?? "", timestamp, ai_summary }`.
  - `argumentMap` → `[]` (legacy pane only; we use the new structural pane).
  - `sessionId` + `sessionKind="live"` so it renders `ThreadedRecordPane` (backed by `argument_units`, realtime).
  - `sessionComplete={false}` while recording.
  - `sessionStartMs` = `new Date(sessionData.created_at).getTime()` so the mm:ss rail matches the debate room.
  - `speakerMeta` keyed by the same display string we pass as `speaker_side` (host name and "Speaker N" fallbacks), with `avatarUrl` / `userId` from current presence + the host's own profile.
- Keep the interim-text shimmer line below the tab content so the user still sees live partials.

### 2. Run the structural pass during live recording

`ThreadedRecordPane` already has `autoTrigger`, but it only fires on mount. To keep the threaded record filling in as the session grows, kick `triggerStructurePass(sessionId, "live", "structure_live")` from `LiveSessionPage` whenever transcript count grows past thresholds (every 5 new finalized entries, debounced 15s; first call after the 3rd entry). Realtime in `useArgumentUnits` propagates new rows to the pane automatically.

### 3. Fix "Speaker 0" → host display name

Today single-device transcripts are stored with `speaker_id: 0`, and `getSpeakerName` falls back to `"Speaker 0"`. Two fixes:

- In `LiveSessionPage`, when single-device recording starts (and `hostDisplayName` is known), seed `speakerNames["0"] = hostDisplayName` in state and persist it to `live_sessions.speaker_names` (idempotent — only if not already set).
- Update the fallback in `getSpeakerName` to return `hostDisplayName` when `speakerNames[id]` is missing **and** `isMulti === false` (single-device → only the host can be speaker). For multi-device, keep the existing `Speaker N` fallback because remote slots may not have presence yet.

### 4. Voice confirmation on the live mic button

Single-device live doesn't use `mic_connections`, so the existing `MicConfirmButton` (which UPDATEs that table) isn't a fit. Add a small local-only confirmation:

- New hook `src/hooks/useLocalVoiceConfirm.ts`: takes `(stream, active)`, runs an `AnalyserNode` RMS loop (same threshold as `MicConfirmButton`: rms ≥ 0.08 sustained ≥ 500 ms), returns `confirmed: boolean`. Resets when `stream` changes or `active` flips off.
- In `LiveSessionPage`, call it with `localStream` (single OR multi). When `confirmed`, render the same green check badge `MicConfirmButton` uses, positioned over the mic toggle inside the `VideoGrid` controls.
  - Cheapest path: pass an optional `voiceConfirmed?: boolean` prop down to `VideoGrid` and render the badge over the local mic button. No DB writes.
- For multi-device, this is purely a UX cue; the lobby's existing `MicConfirmButton` path is unchanged.

## Stress tests to run before shipping

1. **Speaker label** — fresh single-device session as a user whose `display_name` is set: transcript and threaded record show the display name, never "Speaker 0". Then rename the speaker via the ended-record view — name persists.
2. **Tab switching mid-recording** — switch Transcript ↔ Threaded Record while new entries stream in. Scroll position resets per tab is acceptable; no white-flash, no remount of the Deepgram socket (it lives on the page, not in the pane).
3. **Structural pass cadence** — confirm `trigger-structure-pass` is called at most ~once per 15 s and only when entry count grew. Watch network panel for no thundering herd. New `argument_units` rows appear in the Threaded Record tab via realtime without a reload.
4. **mm:ss rail** — first entry shows `0:00`-ish, later entries increase monotonically. Pause + resume does not break offsets (we anchor on `created_at`, not on pause math, matching the debate room).
5. **Voice confirm** — start session muted → no check. Unmute and speak → green check appears within ~1 s. Mute again → check stays (one-shot confirm, mirrors `MicConfirmButton`). Stays across tab switches.
6. **Multi-device** — host + one remote joiner: both names show in Transcript tab (presence → `speaker_names`), threaded record groups by speaker_side correctly, no "Speaker 0" regressions for the host.
7. **Ended session** — end recording mid-stream: the ended view (`LiveEndedRecord` → `RecordShell` → `ArgumentMapContent` with `sessionComplete`) renders the same Threaded Record content (it reads from `argument_units` too), so live and post views stay consistent.
8. **No structural pass on viewer** — a non-host viewing `/live/:id` after end: page is in `phase === "ended"`, the live trigger loop is gated by `phase === "recording"`, so no extra calls fire.

## Files

- Edit `src/pages/LiveSessionPage.tsx` — swap right pane to `ArgumentMapContent`, seed host name into `speaker_names`, kick periodic `triggerStructurePass`, wire voice-confirm badge.
- Edit `src/components/live/VideoGrid.tsx` — accept optional `voiceConfirmed` prop and overlay the green check on the local mic button.
- Add `src/hooks/useLocalVoiceConfirm.ts`.
- No DB changes. No edge-function changes. `analyze-structure` already supports `session_kind="live"` (used by the completion overlay today).

## Out of scope

- Rewriting Deepgram/transcription pipeline.
- Changing the structural AI prompts or anatomy/relationship taxonomy.
- Multi-device WebRTC topology.
- Post-session record view (`LiveEndedRecord`) — already uses the same pane.
