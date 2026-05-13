---
name: Mic-Prep (unified pre-session gate)
description: Unified pre-session gate replacing Mic Lobby across Debate/CMM/Live, plus persistent audio-indicator pulse system and multi-speaker side mechanics
type: feature
---
# Mic-Prep — unified spec (v1)

Replaces the three separate Lobby pages (`DebateLobbyPage`, `CmmLobbyPage`, `LiveLobbyPage`) with one shared `MicPrep` component, conditionally configured per format.

## Core behavior
- **Solo owner**: passes through same gate; auto-advances to room as soon as own mic is ready. Acts as a loading screen.
- **Force-start**: owner can force-start at any time. Mic-prep continues in the background for un-ready participants once the room transitions.
- **Late joiners**: skippable Mic-Prep modal on entry. Skipping = background mic-prep, identical to a disconnect/reconnect of an existing user.
- **Expected speaker count** field: seeds diarization bubbles with labeled placeholders ("Speaker 1", "Speaker 2", …). UI-only — does not configure Deepgram.

## Persistent audio-indicator pulse (Zoom/Discord-style)
The mic-prep green/red pulse is **not** one-time. It becomes a permanent in-room audio indicator.
- **Green pulse** on the active surface while user is speaking (RMS-driven).
- **Red border** while their mic is disconnected.
- Surface mapping (the indicator follows wherever the user is currently represented):
  - **Debate**: profile pic when camera off; camera-feed border when camera on.
  - **Live**: live-transcription bubble + persistent joined-users avatar list at top of display; camera border when camera on.
  - **CMM**: identical pattern to Debate/Live.

## Multi-speaker side picker (Debate, side with >1 speaker)
Triggered in the prep window between turns.
- **Vote** on which side-mate speaks next. Self-votes allowed.
- **Tie-breaker**: random selection, **excluding the most recent speaker on that side**. First turn (no prior speaker) → any tied user eligible.
- **Side-private comms** during prep: text channel + voice (profile pic with green/red pulse) so co-speakers can negotiate.
- **AI summary edit rights**: only the speaker who actually spoke can edit their own argument card. No cross-side-mate edits.
- **Notebook**: extra **shared side tab** appears when side has >1 speaker. All other notebook tabs remain private per user.

## Projector layout trigger
- Explicit `?view=projector` URL (Zoom Rooms / Google Meet companion-mode pattern).
- Auto-detect on screen width ≥1600px as a fallback.

## Layouts
- **Personal device**: session title + format badge + countdown, own mic test (waveform, level meter, device picker, mute), other participants as bubbles (green=ready, gray=not, red=failed), "I'm ready" toggle, owner-only "Force start".
- **Projector / large-screen**: equal-sized bubbles in a grid, big title + topic + QR/join code, heartbeat dot + "Waiting on N of M" counter. No personal mic-test UI.

## Per-format conditionals
- **Debate**: facilitator slot (slender left tab), side picker shown when side has >1 speaker.
- **Live**: Echo Guard toggle, expected-speaker-count field for diarization seeding.
- **CMM**: host + currently active challenger only.
