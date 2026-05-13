---
name: Session Formats
description: Verified spec for Debate, CMM, and Live — roles, lifecycle, mic policy, and v1 caps. Verified with founder May 2026.
type: feature
---

## Cross-format
- Brand mark in projector/facilitator UI is **DYNAMO** (not "d.").
- Lifecycle: Generation template → invites → Mic-Prep → Live → Record.
- All produce a Record; owner toggles public/private.
- All support spawning Notebooks (My Study) from any live moment or finished Record.
- Performance grading is per-user, only visible to that user, only when enabled in session config.
- Unified Projector view (see task) — pattern after Slido/Mentimeter: focal speaker, big timer, live captions, QR/join code, no chrome.
- 13-pattern framework should be a single shared analyzer pass (see task) applied across all 3 formats.
- Mic-Prep collects expected speaker count → seeds labeled bubbles for diarization UX (NOT passed to Deepgram).

## A. Debate — turn-based
- Roles: owner, speakers (1v1 default; 2v2/3v3 allowed if multiple speakers per side), AI facilitator, audience.
- **Facilitator can be invited** as a separate role from the template; owner is facilitator by default. Add a slender left-side tab (single profile slot) in the room UI representing the facilitator.
- Pre-publication invites: owner clicks an explicit "Send invites" button in the template. If not sent before publish, invites auto-fire to invitees' inboxes on publish.
- **Multi-speaker side rule**: when >1 speaker per side, the side selects who speaks for the upcoming round during the prep-phase window. Prep-phase UI must support this picker.
- Mic policy: only active-side speaker has open mic; others hard-muted.

## B. Change My Mind (CMM)
- Roles: host (default facilitator), challengers (queue: speaking or text), spectators, AI facilitator (overridable).
- **Challenger flow**: tap a subtopic → collapses to a "Challenge" button → choose Speaking or Text.
  - Speaking → enters speakers queue (green border on profile).
  - Text → submits position; host engages it via Challenger Navigation (blue border).
  - Non-participating users live under "Spectators" tab (default black border).
- **Challenger Navigation button** (host control panel, bottom of UI, mirrors Debate room control panel — mic, cam, optional textbox, plus this button):
  - Opens transparent overlay with subtopics → challengers list → argument map → consolidation → kick-challenger (only if owner is also facilitator).
  - Selecting a subtopic collapses to ranked list: speakers (green) up top, text (blue) below, spectators (black) bottom.
  - For speaking challengers: an "Activate turn" button transitions the room to a debate/live hybrid view (subtopic + challenger position + live transcription + argument consolidation). Mic policy auto-engages the challenger's mic.
  - Challenger gets a minimal control panel: mute/unmute only.
- **Round end**: host can force-quit via control panel; timer (to be added in template redesign); +30s extension button on host panel; **"You changed my mind" concede button** on BOTH host and challenger panels — ends the round.
- **Post-session**: auto-transition to transcript/threaded record matching Debate + Live design (see task: unify transcript/record output design across all 3 formats).
- Template redesign (tasked): single-page generation, per-subtopic optional position, time controls.

## C. Live — open multi-speaker
- Roles: owner, participants (all may speak), audience.
- **Speaker cap: 8 (v1 hard cap).**
- **Add Mic-Prep to Live** (currently missing) — same flow as Debate/CMM.
- Echo Guard toggle remains.

## v1 Out of scope (logged as tasks)
- Audience promotion to speaker mid-session.
- Spectator question/take submission with dedicated address window (v2).
