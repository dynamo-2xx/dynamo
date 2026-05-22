
## Scope

Three coordinated UI changes. No backend/schema/data changes.

---

### 1. `/my-study` — vertical hero-cards instead of horizontal row cards

Replace the current `NotebookCard` (horizontal row with title/preview/menu) with a vertical **book-cover hero card** matching the home `HomeMyStudyRow` style:

- New component `src/components/study/NotebookHeroCard.tsx`:
  - `w-full aspect-[3/4]` rounded book cover, `monoGradientFromSeed(n.id || title)` background.
  - Top-right: Published/Draft pill + format chip (Debate/CMM/Live) + share-link icon if shared.
  - Bottom of cover: title in Instrument Serif white over gradient scrim, 3-line clamp.
  - Below cover: "MY THOUGHTS" tracked label + 2-line preview, date · annotations meta line.
  - Long-press / checkbox in select mode (port from existing `NotebookCard`).
  - `MoreVertical` dropdown overlaid top-right corner with the same actions (Open / Open record / Rename / Move to folder / Share / Delete; Restore / Delete forever when trashed).
  - dnd-kit `useSortable` wiring preserved (drag the card itself; no separate grip handle).
- `MyStudyPage.tsx`: render `NotebookHeroCard` inside `FolderRow` using a responsive grid:
  `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3`.
- `FolderRow` continues to wrap groups; folder header/dnd targets unchanged.
- Keep filter chips, sort dropdown, empty-state, multi-select bar, rename dialogs — **change nothing else**.

---

### 2. `/my-debates` (My Agenda) — pattern after My Study

Rebuild the page around the same shell:

- **Remove** the three-segment tab bar (Debates / Archive / Live) and the swipe-card list.
- **Add** filter chips (mirrors `StudyFilterBar`):
  - `All · n` · `Active · n` · `Scheduled · n` · `Archive · n` (drafts roll into Archive, matching current behavior).
- **Add** the Explore format filter — extract today's `FormatFilter` + `ExploreFiltersContext` pattern into a reusable inline pill row of `Debate / Live / CMM / Imported` (multi-toggle, all-on by default). Filters the merged list of debates + live sessions + imported records.
  - New component `src/components/home/MyAgendaFormatFilter.tsx` (own provider/context scoped to My Agenda; same UX as Explore's `FormatFilter`).
- **Add** Folders: introduce `agenda_folders` UX using **localStorage only** (per-user, keyed by user id). No DB change. Folder row component reuses `FolderRow` styling.
  - Each item stores `folder_id` in a localStorage map `agenda.folders.v1` → `{ folders: [{id,name}], assignments: {[itemId]: folderId} }`.
  - "New folder", rename, delete, drag-to-folder — all client-side.
- **Hero-cards**: keep existing `DebateCoverCard` (already a hero card), but render in a responsive grid `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3` grouped by folder via `FolderRow`. Drop the swipeable mobile variant.
- Keep existing selection-mode bulk actions (privacy/archive/delete) — wire into the new layout's header buttons (Select / Cancel) identical to My Study.
- Empty states per filter preserved.

---

### 3. Shared expandable top-right search

Promote `FloatingSearch` to a generic component:

- Rename usage: keep `src/components/explore/FloatingSearch.tsx` but expose a `placeholder` prop (default keeps existing copy).
- Mount `<FloatingSearch placeholder="Search notebooks…" value={query} onChange={setQuery} />` in `MyStudyPage` — remove the inline search input from `StudyFilterBar`.
- Mount `<FloatingSearch placeholder="Search my agenda…" value={query} onChange={setQuery} />` in `MyDebatesPage` — searches topic + format label.

---

## Files

**New**
- `src/components/study/NotebookHeroCard.tsx`
- `src/components/home/MyAgendaFormatFilter.tsx`
- `src/contexts/MyAgendaFiltersContext.tsx`
- `src/hooks/useAgendaFolders.ts` (localStorage CRUD + assignments)

**Edited**
- `src/components/explore/FloatingSearch.tsx` — add `placeholder` prop.
- `src/components/study/StudyFilterBar.tsx` — remove search input (search moves to floating).
- `src/pages/MyStudyPage.tsx` — grid layout + hero card + FloatingSearch.
- `src/pages/MyDebatesPage.tsx` — full rewrite of layout: floating search, chip filters, format filter, folders, grid of `DebateCoverCard`.

**Out of scope**
- Backend tables, RLS, migration of agenda folders to DB (localStorage only for v1).
- Changes to `HomeMyStudyRow`, Explore page, individual record pages.
- Changes to `DebateCoverCard` internals.

Ready to implement on approval.
