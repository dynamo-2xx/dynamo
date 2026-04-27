## Goal

Make every published debate opened from Explore feel like a "preview of the final record." Visitors land on a layout that mirrors the threaded record view (cover, title, status, publisher, subtopic dropdowns), so they can see exactly what the finished debate will look like — and scout subtopics before deciding to join.

Behavior by status:
- **Scheduled / draft** — subtopics expand to dimmed skeleton ghost cards (a faint Main / Counter / Affirms shape per side) so the structure is felt.
- **Live** — subtopics are populated with real threads + role-group summaries built from arguments captured up to the moment the page was opened. Empty subtopics still show ghost cards.
- **Completed** — already routes to the existing record view (no change).

## Affected routes

- `/debate/:id/preview` → `DebateScheduledPreviewPage` (rebuilt)
- `/debate/:id` for spectators when status is `scheduled` or `live` (audience preview reuses same shell)
- Mock `/explore/:debateId` page is left as-is for now (out of scope per user answer).

## New shared component

`src/components/debate/DebateRecordPreview.tsx` — pure presentation, fed by props:

```text
┌─────────────────────────────────────────────┐
│  Cover (image OR gradientFromSeed)          │
│   ── status pill · scheduled time           │
│   Topic title (display font)                │
│   by {publisher_name} · {participants}      │
└─────────────────────────────────────────────┘
[ About this debate ▾ ]   (if description)
[ Sides: For | Against ]

THREADED RECORD
┌ 1. Subtopic title ───────────── n threads ▾┐
│   ┌ Thread title ──────────────────────── ▾┐
│   │  ● MAIN — Speaker 1                    │
│   │     ░░░░░░░░░░░░░░░░░░░░  (ghost)     │
│   │  ↳ COUNTER — Speaker 2                 │
│   │     ░░░░░░░░░░░░░░░░░░░░               │
│   └────────────────────────────────────────┘
└────────────────────────────────────────────┘

[ Interested? ]   (sticky bottom — non-owners)
[ Edit debate ]   (sticky bottom — owner)
```

Internal pieces:
- `SubtopicDropdown` — collapsible row matching `ThreadedRecordPane` styling (chevron, display font, "n threads" badge). Defaults closed.
- `ThreadCard` — collapsed row inside a subtopic. For scheduled debates each subtopic gets exactly one ghost thread named "Coming soon".
- `GhostStatementCard` — a `SummaryCard`-shaped block with: faint role label ("MAIN — Speaker 1"), 2 lines of `bg-foreground/5` skeleton bars, no actions. One per side, alternating, with a `↳` for the second.

## Live data wiring

A new hook `src/hooks/useDebatePreviewThreads.ts`:
- Inputs: `debateId`, `status`.
- If `status === 'scheduled'`: returns empty hierarchy → ghosts only.
- If `status === 'live'`:
  1. Fetch `arguments` + `debate_subtopics` + `debate_sides` + `debate_participants` (one-shot, no realtime — snapshot at open time, per user spec).
  2. Group arguments by `subtopic_id`, then build threads via existing `parent_argument_id` chain (root = `parent_argument_id IS NULL`).
  3. Map each argument to a `SummaryCard`-style node: kind = `main` for roots, `counter` / `affirms` / `concedes` based on `argument_type` and the existing detection helpers in `src/components/live/record/types.ts` (`detectsAffirmation` / `detectsConcession`); fallback `counter` otherwise.
  4. Resolve speaker label per side using `debate_sides.label` + side index (e.g. "Speaker 1 · For").
- Returns `{ hierarchy, loading }` consumed by `DebateRecordPreview`.

No realtime subscription — the page is an opened-at-this-moment preview. Refresh re-fetches.

## Page-level changes

**`src/pages/DebateScheduledPreviewPage.tsx`**
- Keep existing data load (debate, subtopics, sides, publisher, owner tabs, Interested CTA, TagPicker).
- Replace the current "Sides + Subtopics + Turns/Time" cards block with `<DebateRecordPreview …>` for the Overview tab.
- Cover hero: existing `cover_image_url` or `gradientFromSeed(topic)` → moved into `DebateRecordPreview`.
- Owner tabs (Overview / Tags / Interested) and bottom CTAs are preserved.

**`src/pages/DebateRoomPage.tsx`**
- For spectators (no `myParticipant`) when `debate.status === 'scheduled'` OR `'live'`, render `<DebateRecordPreview status={debate.status} …>` instead of the current minimal black header + empty body shown in screenshot 1. Speakers/owner keep the existing room UI. (Live spectators will see threads-so-far, scheduled spectators see ghosts.)

## Visual / brand alignment

- Use existing tokens: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `font-display`, `font-body`. No raw hex.
- Skeleton bars: `bg-foreground/[0.06]`, height `h-3`, `rounded-md`, slight opacity pulse via `animate-pulse` to feel alive but subtle.
- Reuse `Collapsible` from `@/components/ui/collapsible` and the chevron rotation pattern from `ThreadedRecordPane.tsx`.
- Status pill copy: `SCHEDULED` (existing) / `LIVE NOW` (red dot) / keep `Spectator` chip if present.

## Files to create

- `src/components/debate/DebateRecordPreview.tsx`
- `src/components/debate/preview/GhostStatementCard.tsx`
- `src/components/debate/preview/PreviewSubtopicSection.tsx`
- `src/hooks/useDebatePreviewThreads.ts`

## Files to edit

- `src/pages/DebateScheduledPreviewPage.tsx` — swap Overview body for new component.
- `src/pages/DebateRoomPage.tsx` — render preview for spectators on scheduled/live.

## Out of scope

- No DB migrations.
- No changes to the Explore card list, the live record view itself, ExploreDebateDetailPage mock page, or the invite-token preview (`DebatePreviewPage`).
- No realtime updates — snapshot at page-open per user spec.
