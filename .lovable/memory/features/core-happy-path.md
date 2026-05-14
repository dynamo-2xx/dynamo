---
name: Core Happy Path
description: Unified Generate → Invite → Mic-Prep → Live → Record spec across Debate, CMM, and Live formats.
type: feature
---

## A. Unified lifecycle
`draft → invited → ready → live → ended → archived`. Single `useSessionLifecycle(kind, id)` hook for all three formats.

## B. Generation template parity
Shared scaffold: cover, topic, schedule, invite tab, publish button. Middle "format-specific" panel swaps:
- **Debate**: sides + per-side speaker seats.
- **CMM**: subtopics + owner position + challenger queue settings.
- **Live**: NO sides, NO queue, NO seats, NO in-person/online toggle. Only optional cover, optional topic, optional tags. Optimized for fast launch — mic-prep handles all device/connection setup.

## C. Invite tab parity
Shared `InviteeBubbleGrid` (pending/accepted/declined). Drag-to-side for Debate; flat list for Live/CMM. Pre- or post-publish send.

## D. Live → Record transition
Single `consolidate-session` edge function produces argument map + grouped subtopic cards + per-speaker transcript before unlocking record view.

## E. Record screen parity
Same hero, threaded transcript, Q&A chat. **One floating notebook button** anchored bottom-right whenever a record is present (no per-entry icons). Per-user grading drawer (owner-enabled only).

## E2. In-room overlay parity (Argument Map + Notebook) — REQUIRED FIX
The Argument Map bubble and Notebook bubble must be **identical across Debate, CMM, and Live**. The record archive is the 1:1 output of the in-room Argument Map, so the in-room overlay mirrors the record format exactly.

**Argument Map bubble — two tabs (rename required):**
- **Threaded Record** (replaces "Map") — collapsible AI-titled argument threads grouped by subtopic. Same component shape as `LiveThreadView`.
- **Transcript** (replaces "Analysis") — flat per-subtopic transcript, grouped consecutive entries. Same component shape as the post-session transcript pane.
- Current "Map" / "Analysis" labels in `ArgumentMapOverlay.tsx` are a build error — fix.

**Notebook bubble — three tabs (per `my-study-v2`):**
- **My Take**, **Thoughts**, **Annotations** — must match the published notebook display page exactly.
- Current single-textarea bubble is incomplete — fix to render the same tab layout as `MyTakeTab` / `ThoughtsTab` / `AnnotationsTab`.

**Parity rule:** both bubbles mount from the same component in Debate, CMM, and Live rooms — no per-format forks. Tab content, draggable/resizable behavior, and fullscreen toggle behave identically.

## F. Host failover (not ownership transfer)
Owner heartbeat lost >60s during live → host role passes to next-most-recent active speaker. Ownership stays with original owner; on reconnect, host role returns to owner automatically. If no replacement available, freeze + auto-end + still produce a record.

## G. Record privacy
- **Default: private** — visible only to owner's followers.
- **Public** — visible to all users; surfaces on Explore, tag pages, and club pages.
- Toggle lives in (1) generation template and (2) top-right of the record page (owner-only).

## H. Performance grading (v1)
Strictly self-only. Leaderboards deferred to v2.

## Future (tasked, out of scope for v1)
- "Continue" button to append a new live session to a previous record.
- v2 leaderboards (global/local, per-tag, per-club).
