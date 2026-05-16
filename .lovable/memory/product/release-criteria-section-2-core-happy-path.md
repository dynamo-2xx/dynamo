---
name: Release §2 Core Happy Path
description: Generate → Invite → Mic-Prep → Live → Record loop must complete clean for Debate, CMM, Live.
type: feature
---

# §2 — Core Happy Path

The canonical end-to-end loop. Detailed UI/state rules live in `features/core-happy-path.md` and `features/mic-prep.md`. This file is the **launch acceptance** version.

## The loop (identical shape across Debate / CMM / Live)
```
Create from template
  └─ Invitations tab (pre-publication)
       ├─ Invitee notified → Accept / Decline
       │    ├─ Decline → red-pulse bubble
       │    └─ Accept → green-pulse → pick side/seat → Confirm (2-click intentional)
       └─ Owner drags accepted bubbles between sides
  └─ Publish → accepted invitees locked + auto-routed to Mic-Prep
Mic-Prep (§2a)
  └─ Every bubble solid + checked → auto-transition to session
Session runs (format-specific rules)
  └─ Argument Map + AI analysis live
End → Record
  └─ Transcript + threaded view + compiled Argument Map
  └─ Owner toggles public/private
  └─ Grading visible to user only if grading enabled in config
```

## Format-specific deltas at launch
- **Debate**: turn-locked mic, prep phase before each subtopic, edit window 48h after end.
- **CMM (Change My Mind)**: host + active challenger mic, queue tab, host can dequeue.
- **Live**: open mic with echo-guard (§4), no sides/queue, stripped template per `core-happy-path.md`.

All three produce the same Record artifact shape so §3 (My Study), §15 (reports), §17 (no impact), and §11 (OG cards) treat them uniformly.

## Acceptance — zero console errors across the loop
Manual end-to-end smoke per format on:
- Desktop Chrome
- Desktop Safari
- iOS Safari (PWA installed)
- Android Chrome

Each run must:
- Complete every step above.
- Produce a viewable Record (own + public toggle).
- Show zero `console.error` from app code (third-party noise from extensions filtered).
- Show zero Sentry `level:error` events with our release tag.
- Show zero failed `supabase.from(...)` calls in network panel.

## Host failover (launch requirement)
- If the owner disconnects mid-session for >60s, a participant flagged `co_host` (auto-elected oldest accepted invitee) gets the publish/control surface.
- Original owner regains control on reconnect.
- Documented in `core-happy-path.md`; this section just asserts it must work in the smoke run by force-killing the owner tab.

## Record defaults
- New records default to **private** (per `core-happy-path.md`).
- Owner can publish with a single toggle in Record header.
- Published record gets OG image (§11), is reachable by URL, indexed by SEO sitemap.

## Acceptance checklist
- 4 platforms × 3 formats = 12 clean smoke runs documented in `docs/launch-smoke-YYYY-MM-DD.md` within 48h of waitlist-off.
- Argument Map populates during session for all 3 formats.
- AI Q&A (record-qa) returns answers with citation hotlinks on a published record (§features/record-qa-chat).
- Notebook icon visible on every session + record and spawns a notebook into `/study` (§3).
- Host-failover smoke passes: kill owner tab, co-host gains control within 60s.
- Public-toggle propagates within 5s (realtime).
- Grading section in Record is hidden when `grading_enabled=false`, visible + populated when `true`.