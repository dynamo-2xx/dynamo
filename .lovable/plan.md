## What we're building

Today, the in-person flow already lets a joiner scan a QR / enter a join code, sign in, test their mic, and pick a side (debate) or display name (live). What's missing:

1. The **owner has no pre-live lobby** showing "who is connected, with which mic, on which device" — they just see counts.
2. **CMM has no in-person join flow at all** — challengers can only join via the queue from a logged-in browser tab.
3. The **fallback path** (someone has no device or skips the mic) is implicit. We make it an explicit choice ("use the room mic / voice detection only") so Deepgram knows when to lean on diarization vs per-device streams.
4. The owner can't currently **gate Start on connected mics**, nor **release / re-invite** a slot.
5. **Mic gating is inconsistent across formats.** We bake the right mute policy into the per-device mic so a joiner's own phone behaves correctly, not just the room.

The plan introduces one shared concept: **the Mic Lobby** — a pre-live screen for the owner, mirrored as "you're connected, waiting for host" for joiners. It also introduces a per-format **Mic Policy** that is enforced on every connected device.

## User stories

- As an **owner of a debate/live/CMM**, after I generate the room I see a Lobby with a slot per expected participant. Each slot shows: avatar, profile name, device label, mic level bar, and a ready check. **Start** is gated on at least one mic being connected per side (debate) / per seat (live, CMM).
- As a **non-owner in the room**, I scan the QR on my own phone, sign in, run the mic test, claim my slot, and land on a "You're connected. Waiting for host…" screen with a live mic meter so I know I'm being heard.
- As a **non-owner without a device** (or who declined mic), I tap **"I'll share the room mic"**. My profile attaches to a slot but is marked *voice-detection only* so Deepgram diarization disambiguates me from the room mic.
- As an **owner**, if a slot is stuck unconnected, I can **release** it or **resend** the join link.
- As a **CMM owner**, in-person challengers can queue *with their own mics already attached* so each challenger's audio is captured cleanly the moment they go active.

## Mic policy by format (NEW)

The lobby attaches per-device mics; the room then governs them:

### Debate — strict turn lock
- Every connected device's mic starts **muted**.
- Only the device whose `user_id` matches the current `current_speaker_side_id`'s active speaker is **unmuted automatically**.
- Manual unmute is **disabled** for everyone else; the in-room mic toolbar shows a lock icon with "Wait for your turn".
- When the turn rotates, the room flips `track.enabled` on every device based on the new speaker.

### CMM — host + active challenger only
- The **owner's** device mic is unmuted whenever a round is active.
- The **active queue row's** device (`cmm_queue.status='active'` and `user_id = me`) is unmuted.
- All other connected devices (waiting challengers, audience speakers) are hard-muted with manual unmute disabled.
- When `cmm_end_round` runs, the previous challenger's mic is force-muted; when `cmm_start_next` promotes the next, theirs unlocks.

### Live — open with echo guard
- All connected device mics are **unmuted by default** (live = conversational).
- A new **"Reduce room echo"** toggle in the host's Lobby (and live in-session menu) does two things when enabled:
  1. Forces any device whose `mic_connections.mode='voice_detect_only'` to mute (so only personal mics are open).
  2. Tags the session with `echo_guard=true`, which makes `useDeviceTranscription` enable Deepgram's `multichannel=true` + per-device endpointing so two open mics in one room don't double-transcribe.
- Voice-detection-only fallback stays on as the disambiguator when `echo_guard` is off and someone joined without a personal mic.

### Enforcement

A new shared hook `useMicPolicy({ kind, sessionId, deviceId })`:
- Subscribes to the relevant turn/round/echo state via Supabase Realtime.
- Computes `{ canSpeak: boolean, locked: boolean, lockReason: string }`.
- Drives `track.enabled` directly on the connected device's stream and disables the manual mute toggle when `locked=true`.

Existing `MediaPermissions` / `InPersonMicBar` / `useLiveSessionRTC.toggleMic` are wrapped to consult this hook before flipping state. The room (`DebateRoomPage`, `ChangeMyMindRoomPage`, `LiveSessionPage`) emits the canonical "who can speak now" signal; nothing changes about how those rooms already track turns.

## Pages & flows

```text
Owner
─────────────────────────────────────────
[Generate room]  ──►  [Lobby]  ──► [Start session]
                       │
                       ├── slot list (sides / seats / queue)
                       ├── connection state per slot
                       ├── "voice-detection only" toggle per slot
                       └── (Live only) "Reduce room echo" toggle

Joiner
─────────────────────────────────────────
QR/code ─► Auth ─► Mic test ─► Side/seat pick
                                    │
                                    ├── connected → "Waiting for host"
                                    │       (mic meter live; mic muted by policy)
                                    └── no device → "Share room mic"
```

### Routes

- `/debate/:id/lobby`, `/live/:id/lobby`, `/cmm/:id/lobby` — owner Lobby.
- `/join/:code` — already exists; routes to a per-format "Waiting for host" screen after connect.
- `/join/:code/cmm` — new, in-person CMM join (claim a queue seat).

## Data model

```text
mic_connections
─────────────────────────────────────────
id              uuid pk
session_kind    text  ('debate' | 'live' | 'cmm')
session_id      uuid
slot_key        text  (side_id, speaker_slot, or 'queue:<idx>')
user_id         uuid (nullable)        -- null when 'voice_detect_only'
device_id       text (nullable)
display_name    text
avatar_url      text nullable
mode            text  ('own_mic' | 'voice_detect_only')
status          text  ('connected' | 'released' | 'left')
last_audio_rms  real default 0          -- broadcast by joiner for owner meter
last_seen_at    timestamptz
created_at      timestamptz default now()
unique (session_kind, session_id, slot_key) where status='connected'
```

Plus on `live_sessions`: `echo_guard boolean default false`.

RLS: SELECT via existing `can_view_*` helpers; INSERT/UPDATE limited to row's `user_id` or session owner; DELETE owner only. Realtime publication added.

`debate_participants`, `live_session_participants`, and `cmm_queue` are unchanged — `mic_connections` is purely the pre-live attachment layer plus the runtime meter feed.

## UI work

### Shared
- `src/components/lobby/MicLobby.tsx` — owner screen, slot list, Start button.
- `src/components/lobby/LobbySlotRow.tsx` — avatar, name, device, mic-level bar (`last_audio_rms`), ready check, kick/release.
- `src/components/lobby/WaitingForHost.tsx` — non-owner mirror with live mic meter and lock-status hint.
- `src/components/lobby/VoiceDetectOnlyToggle.tsx`.
- `src/components/lobby/EchoGuardToggle.tsx` (Live).
- `src/hooks/useMicPolicy.ts` — the per-format gate described above.

### Per-format wiring
- `CreateDebatePage`, `CreateChangeMyMindPage`, `LiveSessionPage` — after creating draft, route into the matching Lobby.
- `JoinDebatePage` — after `MicTestStep` resolves, write `mic_connections` (`mode='own_mic'`), then `WaitingForHost`. Add "I'll use the room mic" → `mode='voice_detect_only'`.
- `LiveJoinPage` — same lobby write before transitioning to `recording`. Recording phase triggers when owner presses Start (subscribe to `live_sessions.status` flip).
- New `JoinCmmPage` — claims a queue seat + writes `mic_connections`.
- `DebateRoomPage`, `ChangeMyMindRoomPage`, `LiveSessionPage` — wrap mic toggles via `useMicPolicy`; surface lock reason in the mic toolbar.

### Owner controls in Lobby
- "Start" disabled until policy minimum met.
- Per-row: Release seat, Resend link, Kick (post-start).

## Deepgram integration

`useDeepgramTranscription` / `useDeviceTranscription` already key on `device_id` and `speaker_slot`. We extend the resolver:
- Slot with `mic_connections.mode='own_mic'` → that device's stream feeds the slot directly (no diarization).
- Slot only `voice_detect_only` → room device falls back to diarization.
- Live + `echo_guard=true` → enable `multichannel=true` and stricter endpointing per the existing hardware-access memory.

No new edge function needed.

## Out of scope for v1

- Per-device noise profiles (just the echo guard above).
- Reassigning a connected mic to a different slot mid-session.
- Audience members opting into mic capture.
- Live multi-device WebRTC mesh changes (already shipped).

## Files touched

- **Migration**: new `mic_connections` table + RLS, helper `can_view_lobby(kind, id)`, `live_sessions.echo_guard` column, realtime publication.
- **New pages**: `DebateLobbyPage`, `LiveLobbyPage`, `CmmLobbyPage`, `JoinCmmPage`.
- **New components**: `src/components/lobby/*`.
- **New hooks**: `useMicLobby` (owner list+realtime), `useMicLobbyAttachment` (joiner heartbeat + RMS broadcast), `useMicPolicy` (shared gate).
- **Edited**: `App.tsx` (routes), `CreateDebatePage`, `CreateChangeMyMindPage`, `LiveSessionPage`, `JoinDebatePage`, `LiveJoinPage`, `InPersonJoinPanel`, `MediaPermissions`, `InPersonMicBar`, `useLiveSessionRTC` (mic policy hook integration), and the three room pages.
- **Memory**: extend `mem://features/onboarding-invite-flow.md`; new `mem://features/mic-lobby.md` and `mem://features/mic-policy.md`.
