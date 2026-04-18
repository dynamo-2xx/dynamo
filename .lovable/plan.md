

## Issues & Confidence

**1. Tags not bucketing debates (95% confident in fix)**
- Cause: `debate_tags` insert in `CreateDebatePage.tsx:382-386` is awaited but errors are silently dropped — also no log if `selectedTags` is empty at submit. DB confirms `tag_count=0` for all recent debates including the published one.
- Fix: capture `{ error }` from the insert, `toast.error` + `console.error`, and short-circuit the success navigation if tagging fails. Verify `selectedTags.length` at submit time with a log.

**2. Preview page "not working" (98% confident)**
- Cause: `DebateCoverCard` only routes **non-owners** to `/debate/:id/preview`. Owners (the user testing) are sent to `/debate/:id` — the dark debate room shown in the screenshot. Preview page itself renders correctly when reached directly.
- Fix in `DebateCoverCard.tsx`: route to `/preview` for `scheduled` or `draft` status regardless of owner. In preview page, when `isOwner`, replace the "Interested?" CTA with an "Edit / Set time" button + a small list of pending interest pings.

**3. Archived debates leaking into Home/Explore (99% confident)**
- Cause: `useFeaturedDebates`, `useTrendingDebates`, `useLatestDebates`, `useDebatesByTag` in `useExplore.ts` only filter `is_public=true`, never exclude `status='archived'`.
- Fix: add `.neq("status","archived")` to all four queries. `useForYouDebates` and `useMyRecentDebates` already exclude archived correctly.

**4. Debate-room flow verification**
- Static review only (read-only mode). Will sanity-check `DebateRoomPage` timer, prep, ready-state, and turn-progression branches end-to-end on the next default-mode pass and report a confidence %.

## Files to edit
```text
src/pages/CreateDebatePage.tsx          — await + error-handle debate_tags insert
src/components/home/DebateCoverCard.tsx — route owners to /preview for scheduled/draft
src/pages/DebateScheduledPreviewPage.tsx — owner panel (edit + interest list)
src/hooks/useExplore.ts                  — exclude archived from 4 queries
```

No DB migration. After the fixes I'll walk the debate room flow and post a confidence % per leg (publish → preview → start → prep → turn → next subtopic → completion).

