## Goal

Make `/debate/:id`, `/import/:id`, and the completed `/live/:id` (+ `/live/shared/:token`) render with the exact same shell:

```text
[ Hero card (cover, title, status, meta) ]
[ Row of pills — Side 1 / Side 2  OR  user pills ]
[ Tabs: Transcript | Threaded record ]
[ Pane content + comments ]
```

Live's pills replace the two side pills with **identically-shaped** pills (same height, padding, border, font sizing as `Side 1 / Side 2`) — one per speaker, avatar + username inside. Arrangement: 1 row when ≤2 pills, 2×2 grid when 3–4, horizontal slider (Explore-style snap row with arrows) when ≥5. Pills that resolve to a real `user_id` are `<Link>`s to `/profile/:username`; unresolved ones render as the same pill without a link.

## New / reused components

`src/components/record/RecordShell.tsx` — presentational wrapper used by all three record pages.
Props:

- `topic`, `description`, `status` (`completed | live | scheduled | processing | failed`)
- `coverImageUrl`, `publisherName`, `participantCount`, `createdAt`, `endedAt`
- `kind`: `"debate" | "live" | "imported"` (controls back-link label + imported badge)
- `sidesRow`: ReactNode (the pills row, computed by the page)
- `headerActions`: ReactNode (Share, Continue, PerformanceInsightsToggle, etc.)
- `children`: tab body

Internally reuses the hero markup currently in `DebateRecordPreview` (gradient/cover, status pill, title, meta) so the look matches the screenshot exactly. Strip the rest of `DebateRecordPreview` (sides cards, threaded record section).

`src/components/record/SidePill.tsx` — the single canonical pill component. Variants:

- `kind="side"`: shows `SIDE N` eyebrow + colored label (current look).
- `kind="user"`: shows avatar (8px circle) + `@username` in the same outer pill (same border, padding, radius, height as `kind="side"`).
Both render at the same min-height so a side row and a user row are visually interchangeable.

`src/components/record/ParticipantsRow.tsx` — layout-only:

- 1–2 pills → `grid grid-cols-2 gap-3` (same as today's sides).
- 3–4 pills → `grid grid-cols-2 gap-3` (auto wraps to 2×2).
- ≥5 → horizontal scroll-snap row with left/right arrows (mirroring `src/components/explore/*` shelf arrows, using `useEdgeScroll`). Each pill fixed width so they line up.

`src/components/record/RecordTabs.tsx` — the simple Transcript / Threaded record tabbed body lifted from `ImportedRecordPage` lines 190-217, including the `PerformanceInsightsToggle` slot. Wraps `<ArgumentMapContent tab={tab} … />`.

## Page-by-page changes

`**src/pages/ImportedRecordPage.tsx**`

- Replace hand-rolled header + tabs with `<RecordShell kind="imported" sidesRow={null} … >` and `<RecordTabs … />`. (No pills row for imports.)
- Keep `RecordCommentsSection`, `RecordToolsMount`, `InsightsProvider`, `useDocumentMeta`, status/progress banner unchanged.

`**src/pages/DebateRoomPage.tsx**` (completed branch around line 1987) and `**src/pages/DebateScheduledPreviewPage.tsx**` (line 322)

- Replace `<DebateRecordPreview … />` with the new shell:
  - `sidesRow` = `<ParticipantsRow><SidePill kind="side" … /></ParticipantsRow>` driven by `sides` / `fallbackSideLabels`, identical look to today.
  - Body = `<RecordTabs … />` instead of the threaded-only record + bottom transcript button.
- Delete `DebateRecordPreview.tsx` once both call-sites migrate; move its hero markup into `RecordShell` and its "preview/ghost" rendering into `RecordTabs`' threaded pane (only active when `status !== "completed"` and no live data — `useDebatePreviewThreads` stays).
- The "About this debate" `<details>` block stays, rendered by the shell when `description` is provided.

`**src/pages/LiveSessionPage.tsx**` (ended phase) and `**src/pages/SharedLiveSessionPage.tsx**`

- Stop using `SessionRecordViewV2`. Render the same `<RecordShell kind="live" … >` + `<RecordTabs … />`.
- Build pills from `speakerNames`:
  1. Resolve user_ids: query `live_session_participants` (multi-device) for `(speaker_slot, user_id)` and join `profiles` for `username` + `avatar_url`. For single-device sessions, treat `created_by` as speaker 0.
  2. For each pill: if a `user_id` is resolved, link to `/p/:username` with avatar; otherwise render the same pill shape with initials + name, not clickable.
- `headerActions` keeps Share, Continue, and the existing PerformanceInsightsToggle.
- **Drop** the split-pane, notebook, highlight-annotate, citations, cross-refs, mobile threads/transcript toggle. `RecordToolsMount` is added for Q&A so live records keep the floating Q&A chat (already present on imported and debate). Comments section stays.
- `SessionRecordViewV2.tsx`, `SessionRecordView.tsx`, and the now-unused notebook/annotation/citation hooks called only from V2 become dead code. Delete `SessionRecordViewV2.tsx` + `SessionRecordView.tsx`; leave the hooks alone (cheap, may be reused later) unless they reference deleted props.

## Data: resolving live participants to users

For multi-device sessions:

```sql
select speaker_slot, user_id from live_session_participants where session_id = :id
```

Join with `profiles` to get `username` + `avatar_url`. For single-device sessions, fall back to `live_sessions.created_by → profiles`.

If a speaker_slot has no row, render the pill without a link. Result is a `participants: { slot, name, userId?, username?, avatarUrl? }[]` array, ordered by `slot`, that feeds `ParticipantsRow`.

No schema changes. No edge function changes.

## Styling parity

`SidePill` is the single source of truth. The side variant keeps the current `SIDE 1` eyebrow + colored label; the user variant uses the same outer container (same `rounded-xl border border-border bg-card`, same vertical padding) with avatar+username inside, so a row of two user pills and a row of two side pills are pixel-equivalent in height/border/spacing. Slider arrows reuse the styles already used by Explore shelves.

## Out of scope

- Renaming/restructuring the threaded record itself (`ArgumentMapContent`, `ThreadedRecordPane`).
- Backend changes to `analyze-structure` / structure prompts.
- Editing transcripts (split/merge UI) — that lived in `SessionRecordView`; live records become read-only in the new shell. If we want to keep that, it can be re-added in a follow-up.   
MY COMMENT ON THIS LAST BULLET-POINT: USERS CAN HIGHLIGHT TO ANNOTATE ANY TEXT FROM THE TRANSCRIPT/THREADED RECORD WHICH SAID CONTENT CAN CREATE/WILL BE STORED IN THE CORRESPONDING NOTEBOOK AND STORED IN MYSTUDY. 