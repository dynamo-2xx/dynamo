---
name: Section 4 — In-person reliability
description: Per-format mic policy, voice-only fallback w/ guest-account piggyback, echo guard, soft readiness gate, slot reconnect rules
type: feature
---

# Section 4 — In-person reliability

## Per-format mic policy (already partially built; confirm enforcement)
- **Debate**: turn-lock — only the side whose turn it is may transmit; others muted at the WebRTC layer.
- **Change My Mind**: host mic + active challenger mic only.
- **Live**: open mic with **echo guard** (advisory).

## No-device participants — "piggyback" model
A participant without their own device can still be a distinct speaker via a host/peer's device:
1. **Authenticated piggyback**: the no-device user signs into their account on the host's device → that device emits audio tagged with the no-device user's `user_id`.
2. **Guest piggyback (no account)**: host creates a temporary guest profile (display name only). Audio is tagged with the temp profile id; transcript shows the display name. Temp profile is session-scoped and deleted on session end (or promoted if the guest later signs up with the same handle).
- The host device shows a small "Speaking as: [name]" pill so the host can switch tag mid-session.
- Voice-fingerprint / RMS-based auto-detect remains available as a separate setting; both modes can coexist.

## Echo guard (Live)
- **Advisory only.** Banner: "Other devices nearby — mute to prevent echo." Detected via shared join code + audio cross-correlation.
- No auto-mute.

## Mic-Prep readiness — SOFT gate
- Confirms current spec: owner can force-start; passing the test is a *precaution*, not a hard wall.
- Mic confirmation continues *during* the session (per-turn check on Debate; per-claim on CMM; ongoing on Live).

## Slot reconnect — HOLD
- Disconnected speaker's slot is **held until the owner manually releases it** (drag bubble out, or "Release slot" menu). No auto-drop timeout.
- A small "Disconnected" badge on the bubble communicates state; transcript marks them inactive but slot is preserved.

## Acceptance
- Each format completes a clean in-person run with at least one no-device participant on guest piggyback.
- Echo banner appears on a 2-device co-located test.
- Force-start works; mid-session reconnect resumes into the same slot.
