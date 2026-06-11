# Finish Live for Launch + Retire the Mic Lobby

Ordered by your rule: integration bugs first, then the live polish you already approved, then the lobby retirement (live → debate/CMM last). Voice-confirmation replaces the lobby's only real job.

---

## P0 — Integration bugs (unchanged from prior plan)

### 1. Viewing a live record triggers mic/camera prompt

**Cause.** `LiveSessionPage` mounts with `phase = id ? "recording" : "setup"` (line 56), so `useLiveTranscription` / `useLiveSessionRTC` start with `isActive = true` and call `getUserMedia` before the row fetch decides the session is actually `ended`.
**Fix.** Add `phaseResolved` gate; render a loading shell until the row loads, then derive phase from `status`. Pass `isActive={phaseResolved && phase === "recording" && !liveIsPaused}` to all three hooks. Add a defensive `if (!isActive) return;` at the top of each hook's `getUserMedia` effect.

### 2. Host user-pill missing on live records

`useLiveParticipants` builds pills only from `speaker_names`. Single-device legacy sessions have none → empty row.
**Fix.** Fallback: when no pills resolved and `createdBy` is set, push one pill `{ slot: 0, name: profile.display_name, userId: createdBy, avatarUrl }`.

### 3. Description missing + no owner Edit affordance

`RecordShell` already accepts `description` but no page passes it; no Edit anywhere.
**Fix.** Wire description through all three pages (`live_sessions.description` new column; `imported_records.description` + `debates.description` already exist). Add a `RecordEditButton` slot top-right of `RecordShell`, owner-only, opens a modal with `CoverImageUploader` + description textarea. Per-page save handler hits the right table.

---

## P1 — Live polish (unchanged from prior plan)

### 4. Session length cap + analysis progress bar

- Soft warn at 60 min, hard cap at 120 min with banner + auto-end.
- New `<AnalysisProgress />` with two segments: "Live insights" (last `analyze-transcript` tick) and "Deep analysis" (`analyze-structure` + `analyze-performance` via `trigger-structure-pass` / `trigger-deep-perf`). Polls every 5s while pending; hides when both done.

### 5. Time-anchored transcript bubbles

Two-column transcript: left rail `mm:ss` (or `hh:mm:ss` ≥1h) top-aligned with each bubble, computed from `entry.timestamp − session.started_at`. Mode toggled on by `RecordShell` for all three record types.

### 6. Avatar + display name on every bubble

Pipe the `useLiveParticipants` slot→user map into the transcript renderer; bubbles show `<Avatar>` + display name. Fallback: initials avatar + "Speaker N".

---

## P2 — Retire Mic Lobby, replace with in-room voice-confirm (NEW)

Scope order you set: ship live first, then debate/CMM. Same UX everywhere.

### What gets deleted

- `src/components/lobby/MicLobby.tsx`, `LobbySlotRow.tsx`, `EchoGuardToggle.tsx` (Echo Guard moves to in-room overflow menu).
- `src/pages/LiveLobbyPage.tsx`, `CmmLobbyPage.tsx`, `DebateLobbyPage.tsx`.
- Routes for `/live/:id/lobby`, `/cmm/:id/lobby`, `/debate/:id/lobby` are removed; `<Navigate>` redirects to the room.
- Hook `useMicLobby` stays usable for owner presence/debugging but is no longer a launch gate. `useMicLobbyAttachment` becomes a no-op shim → delete after consumers are gone.
- `MicPrep` spec in `mem://features/mic-prep` is rewritten to reflect "no lobby, in-room mic-button voice-tag" instead.

### Replacement: Mic button states

A single shared `<MicToggleButton />` used by Debate / Live / CMM rooms. State machine driven by `voiceTaggedAt` on the current `mic_connections` row (or local profile flag for solo single-device live):

```text
 ┌─────────────┐ enable mic  ┌──────────────┐ confirm voice  ┌──────────┐
 │  OFF (gray) │────────────▶│  ON · orange │───────────────▶│ ON · plain│
 └─────────────┘             │   ring       │                └──────────┘
                             └──────────────┘
                              long-press / right-click → open ConfirmVoice bubble
                              (also openable later from button menu to re-tag)
```

- **Orange ring** = mic is on but `voiceTaggedAt IS NULL`. Aria-label: "Voice not confirmed — long-press to set up".
- **Plain** = `voiceTaggedAt` set.
- **Re-open**: right-click (desktop) or long-press (mobile, ≥500ms) at any time, even after confirmation. Quick-tap still toggles mic on/off.

### ConfirmVoice bubble

Popover anchored to the mic button.

1. Prompt: "Hold and read aloud for 5–10 seconds so we can match your voice."
2. Record button → captures via `getUserMedia` (reuses existing stream when possible). Live waveform.
3. On stop: upload sample to `voice-samples` private bucket, write `profiles.voice_sample_path` + `profiles.voice_tagged_at`, and write the current `mic_connections.voice_tagged_at`. Show ✓ for ~700ms, auto-close.
4. Failure / cancel: orange ring stays, no toast spam.
5. Re-open at any time to redo (overwrites previous sample).

Diarization is **not** done here. The sample is stored for the future Deepgram speaker-ID work (already flagged as v2 in the previous plan). What ships now: the UX, persistence, and the slot→user mapping benefits downstream (pills + bubbles).  
Question: what does it mean that diarization is not done here? Isn't that how the voice is confirmed to the user identity?

### Pin behavior

- Desktop right-click = `pinned = true`; bubble stays open until user closes or confirms.
- Mobile long-press = `pinned = true` for the duration of the press; release before threshold cancels.
- Quick tap = mic on/off only, no bubble.

### Where the lobby's other jobs go

- **Force start** → no longer needed; live recording starts the moment owner hits Start on the setup screen (already true for single-device).
- **Multi-device "wait for joiners"** → join-code card moves into the in-room invite popover (already exists in `LiveSessionPage`). Joiners landing via `/live/join/:code` go straight to the room; their `mic_connections` row is created from inside the room.
- **Echo Guard** → moved into `DisplayOptionsMenu` (already in-room).

---

## P3 — Debate-only: replace lobby with "Join when it starts" (AFTER P2)

### Behavior

- Tapping a debate's **Join** / queue button **does not** route to a lobby. It writes a `debate_participants` row (or `debate_interests` for spectators), keeps the user on whatever page they were on, and shows a toast: "You're in. We'll notify you when it starts."
- A small persistent strip appears in `AppLayout`: `🟠 In queue for {topic} — view details`. Tap → debate preview page.
- When the owner flips status to `live`, an `inserts` trigger on `debates` (or a fan-out in the existing `dispatch-debate-start-push` path) sends:
  - Web Push notification: `"{topic} has started!"` with a `JOIN` action.
  - In-app `notifications` row of type `debate_started` with deep link `/debate/:id`.
  - If the user has the app open, a toast with a JOIN button (uses the existing `Sonner` toast action API).

### Edge cases

- Owner is the exception — they go straight from create flow into the room (no self-notify).
- If user is already inside another debate/live/cmm when their queued debate starts, the toast still appears but the JOIN button warns "End current session to switch."
- Notifications respect existing per-user Web Push opt-in. If unsubscribed, only in-app notification + toast (when foregrounded).

### Files touched

- `src/components/DebateCard.tsx` and the queue buttons → remove navigate-to-lobby.
- `src/App.tsx` → remove `/debate/:id/lobby` route, redirect to `/debate/:id`.
- New `src/components/QueuedDebateStrip.tsx` in `AppLayout`.
- `supabase/functions/dispatch-debate-start-push/index.ts` → already exists; extend to also write in-app notifications for queued participants.
- Migration: add `notifications.kind = 'debate_started'` if not present; no schema change needed beyond that.

---

## Data (single migration, runs with P0/P1)

- `alter table live_sessions add column description text;`
- `alter table live_sessions add column deep_perf_done_at timestamptz;`
- `alter table profiles add column voice_sample_path text;`
- `alter table profiles add column voice_tagged_at timestamptz;`
- `alter table mic_connections add column voice_tagged_at timestamptz;`
- New private storage bucket `voice-samples` with RLS: owner-only read/write.

## Out of scope

- Real voice diarization / Deepgram speaker-ID matching (v2; sample is stored, not yet used). Question: WHY NOT?
- Backfilling old sessions.
- Re-imagining the in-room mic UI beyond the ring + bubble.

---

## Ship order

1. P0 fixes (mic-prompt, host pill, description+Edit).
2. P1 polish (length cap, analysis bar, time-rail, avatar bubbles).
3. P2 mic-button voice-confirm + retire lobby for Live and CMM.
4. P3 debate "Join when it starts" + retire debate lobby.