

# Notebook split view + mobile-first restyle

Two additions on top of the previously-approved Dynamo tab + collapsible record/transcript work. Nothing else changes.

## 1. Split view between Notebook tabs

Let the user view two notebook tabs side-by-side instead of one at a time.

- New "Split" affordance in the Notebook tab bar (right side, next to the close button): a small `⫲` icon button.
- Click it → enters split mode. The active tab becomes the **left pane**; a tab picker appears on the **right pane** ("Pick a tab to compare…" with chips for the other three tabs: Thoughts / Annotations / My Take / Dynamo, minus whatever is on the left).
- Once both sides are chosen, the panel renders two stacked-or-side-by-side panes:
  - **Mobile (<768px)**: stacked vertically (top/bottom), 50/50 default, horizontal divider drag to resize.
  - **Desktop (≥768px)**: side-by-side (left/right), 50/50 default, vertical divider drag to resize.
- Each pane has its own mini header: tab name + a small `×` to close that pane (returns to single-tab view with the other pane's tab active) and a `⇄` to swap which tab is on which side.
- A second `⫲` click (or closing one pane) exits split mode.
- Split state (enabled + which two tabs + split ratio) persists in `localStorage` per session: `dynamo:notebook-split:<sessionId>`.
- Both panes are fully interactive (typing in Thoughts on the left while reading Annotations on the right, etc.). Auto-save behavior unchanged.
- Same split feature is mirrored in the full-page `MyStudyDetailPage.tsx` notebook.
- Files touched:
  - `src/components/live/record/NotebookPanel.tsx` — split state, dual-pane render, divider, header controls.
  - `src/pages/MyStudyDetailPage.tsx` — same split UI around the four tab panes.
  - `src/components/live/record/NotebookSplitDivider.tsx` — **new**, shared draggable divider (horizontal on mobile, vertical on desktop, via a `direction` prop).

## 2. Mobile-first restyle pass for Notebook + Record page

Restyle every surface touched in this build (Notebook panel, Dynamo pane, My Study list/detail, collapsible record/transcript layout) using a mobile-first approach: base styles target small screens, `md:` and `lg:` add desktop refinements. No visual change to anything outside this scope.

- **Base (mobile, <768px) defaults**:
  - Notebook panel: full-screen sheet from the bottom (not a draggable floating window). Header is a thin grab-bar + tab row that horizontally scrolls if tabs overflow. Close button top-right.
  - Tab labels truncate to icon + first letter when width is tight; full label on `sm:` and up.
  - Tap targets ≥ 44px. Body text 15px, headings 18px.
  - Split mode on mobile: vertically stacked panes, divider is a 12px-tall grab bar with center pill.
  - My Study list: single-column cards full-bleed with 12px gutters; filter chips horizontally scroll under the search bar; `Select` toggle and `+ New folder` collapse into a `⋯` overflow menu.
  - Multi-select bar pinned to the bottom safe-area (`pb-[env(safe-area-inset-bottom)]`).
  - Detail editor: tab row scrolls horizontally; share/rename collapse into the `⋯` menu.
  - Collapsible record/transcript split: on mobile keep the existing toggle pill (only one pane at a time); collapse rails are desktop-only.
- **`md:` (≥768px) layer**:
  - Notebook becomes the floating draggable/resizable panel again.
  - My Study list becomes a multi-column flex with hover affordances; filter chips inline.
  - Detail editor shows full action row with share + rename inline.
  - Record/transcript split shows side-by-side with rail-collapse buttons.
- **`lg:` (≥1024px) layer**: wider max-widths, more generous padding (`lg:px-8 lg:py-12` on My Study; `lg:max-w-4xl` on detail page).
- Typography: Instrument Serif for titles at `text-xl md:text-2xl lg:text-3xl`; DM Sans body at `text-[15px] md:text-sm`.
- Borders stay 0.5px hairline `rgba(0,0,0,0.1)`. Pills, buttons, drag handles unchanged in color — only sizing/spacing tokens are touched.
- Files touched (style-only, no logic):
  - `src/components/live/record/NotebookPanel.tsx`
  - `src/components/live/record/DynamoChatPane.tsx` (created in prior step)
  - `src/components/live/record/notebook/ThoughtsTab.tsx`, `AnnotationsTab.tsx`, `MyTakeTab.tsx`
  - `src/pages/MyStudyPage.tsx`, `src/pages/MyStudyDetailPage.tsx`, `src/pages/SharedNotebookPage.tsx`
  - `src/components/study/NotebookCard.tsx`, `FolderRow.tsx`, `StudyFilterBar.tsx`, `MultiSelectActionBar.tsx`, `ShareMenu.tsx`, `RenameDialog.tsx`
  - `src/components/home/HomeMyStudyRow.tsx`
  - `src/components/live/record/SessionRecordViewV2.tsx` (only the record/transcript split shell touched in prior step)

## Out of scope

- Changing any other page or component.
- Restyling the in-session Debate Room or Live transcription views.
- Three-way or N-way notebook splits (only 2 panes supported).
- Persisting split state server-side (localStorage only).

