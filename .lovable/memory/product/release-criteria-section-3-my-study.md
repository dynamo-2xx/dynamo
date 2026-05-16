---
name: Release §3 My Study
description: Notebooks as co-equal pillar — spawn, tab, publish (Take or full), comment, notebook-on-notebook.
type: feature
---

# §3 — My Study

Detailed product rules live in `features/my-study-v2.md`. This file is **launch acceptance**.

## Spawn rules
- Notebook icon visible on:
  - Every Debate room + Debate record.
  - Every Live session + Live record.
  - Every CMM room + CMM record.
  - Every published notebook (notebook-on-notebook).
  - Every public profile (general-purpose notebook).
- Clicking the icon creates a notebook bound to that source in `/study`, opens it as a floating overlay (per `my-study-v2`).
- Notebooks are private to the owner by default. Always.

## Notebook structure
- Tabs supported at launch: **Annotations**, **My Take**, **Thoughts** (per `my-study-v2` components).
- Every notebook always links back to its source record (button in header).
- Highlight-to-comment inside any record spawns a sub-notebook scoped to that highlight.

## Publishing — two independent toggles
1. **Publish notebook** → notebook becomes its own Record. Reachable by URL, shows on profile, comment-able, can be the source of further notebook-on-notebook.
2. **Publish My Take** → the My Take tab content is promoted to a hero card on the owner's profile (separate from full-notebook publish).

Both toggles default off. Both reversible at any time. Unpublishing hides from public surfaces but keeps the data.

## Reader interactions on a published notebook
- Comments (replaces older "reader notes" pattern per `my-study-v2`).
- Highlight any passage → spawn own notebook about it.
- Cannot edit the original (owner-only).

## Profile surface
- Published notebooks render as hero cards using the same component shape as debate/live/cmm record cards.
- Profile tabs: Debates · Live · CMM · Notebooks · Takes.

## Floating overlay UX (per `my-study-v2`)
- Notebook opens as draggable + resizable + fullscreen-able overlay matching the published-doc UI.
- Closing the overlay does not delete; it persists in `/study`.
- Share button in overlay header.

## Data model (already exists, listed for acceptance)
- `notebooks` (id, owner, source_kind, source_id, title, is_published, my_take_published, published_at, …).
- `notebook_folders` (organization).
- `notebook_comments` (per `useRecordComments` pattern, but scoped to notebook).
- RLS: owner full access; published notebooks readable by anon if `is_published=true`.

## Acceptance checklist
- Notebook icon present and functional on all 5 spawn surfaces listed above.
- Spawning a notebook from any source creates a `notebooks` row with correct `source_kind` + `source_id`.
- Publish-notebook toggle round-trips: public URL renders, profile card appears, comments work; unpublish reverses all three within 5s.
- Publish-My-Take toggle independent of full-publish; both states (Take-only, full-only, both, neither) all valid and render correctly on profile.
- Notebook-on-notebook: highlight on a published notebook spawns a sub-notebook in the reader's `/study`; sub-notebook links back to parent.
- Floating overlay drag/resize/fullscreen all work on desktop; mobile uses full-screen sheet (per §7 Mobile).
- Owner-only edit enforced by RLS (security scan clean).
- Notebook visibility respects `is_published` flag across Explore/profile/direct URL.
- Deleted owner anonymizes published notebooks (matches §9 deletion behavior).