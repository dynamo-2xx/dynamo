# P1 — Live polish (with 1hr cap update)

P0 is done. P2 (retire mic lobby + voice-confirm) and P3 (debate "Join when it starts") stay as previously approved. This view shows the full P1 scope with the new clock-button cap folded in.

---

## 4. Session length cap + clock button (UPDATED)

### Rule

- Hard cap: **60:00** from `live_sessions.started_at`.
- At 60:00 → auto-end: stop capture/transcription/RTC, flip `live_sessions.status = 'ended'`, stamp `ended_at`, kick off `analyze-structure` + `analyze-performance` (same path as owner-initiated End).
- Toast on auto-end: "Session ended — 1 hour limit reached." Then route to record view (no permission re-prompt thanks to P0 phase gate). Non-owner devices observe the realtime status flip and follow.

### Clock button (top bar, next to mic/cam)

- Default: minimal clock icon, no numeric time. Intentionally de-emphasized so the existing speaker timer (the one in the transcript) stays the user's primary time cue.
- Tap → small popover: `XX:XX remaining` + "Session auto-ends at 1:00:00". Owner sees an "End early" link.
- Lives in `src/components/live/SessionClockButton.tsx`, mounted in `LiveSessionPage.tsx` next to the mic/cam toggles.

### Auto-expanding "time-left" bubble

The clock morphs into a bubble automatically at two thresholds, then collapses back to the icon:

- **30:00 remaining** → bubble `30:00 left` for **5 seconds**, then revert.
- **5:00 remaining** → bubble `5:00 left` for **5 seconds**, then revert.
- No other passive warnings, no banners — these two ambient pulses are the entire warning system.
- Bubble uses the same monochrome styling as the existing speaker timer (DM Sans, 0.5px border) so they read as the same family without competing.

### Auto-end mechanics

- Single `setTimeout` chain anchored to `started_at`, re-armed on mount so it survives reloads.
- Owner-initiated End still works at any time and short-circuits the timer.

---

## 5. Analysis progress bar (unchanged)

- New `<AnalysisProgress />` shown on the ended record with two segments:
  - **Live insights** — last `analyze-transcript` tick.
  - **Deep analysis** — `analyze-structure` + `analyze-performance` via `trigger-structure-pass` / `trigger-deep-perf`, completion stamped by `live_sessions.deep_perf_done_at`.
- Polls every 5s while either segment is pending; hides when both are done.

---

## 6. Time-anchored transcript bubbles (unchanged)

- Two-column transcript on ended records: left rail `mm:ss` (or `hh:mm:ss` ≥1h) top-aligned with each bubble, computed from `entry.timestamp − session.started_at`.
- Toggled on by `RecordShell` for all three record kinds (live, debate, imported).  
Use Apple IOS liquid glass style for the display

---

## 7. Avatar + display name on every bubble (unchanged)

- Pipe the `useLiveParticipants` slot→user map into the transcript renderer.
- Bubbles show `<Avatar>` + display name. Fallback: initials avatar + "Speaker N".

---

## Out of scope for P1

- Per-tier cap differentiation (Pro/Education longer sessions) — flat 60min for launch, revisit with monetization.
- Applying the cap to Debate or CMM rooms.
- Pausing time when the session is paused — clock runs off `started_at` for v1 simplicity.   
PAUSING ALSO PAUSES THE TIME LEFT TIMER.
- Real voice diarization (that's P2's voice-confirm storage + v2 Deepgram work).