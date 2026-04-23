

# My Study — Notebook Library

A personal library of every notebook the user has built. Lives in the **Profile tab (above My Agenda)** and as a **Home page row (above "Find people to debate with")**. Supports search, sort, multi-select delete, folders, manual reorder, rename, share, and revisit-to-edit. Publish stays inside the **My Take** tab only.

## User stories

1. **The recap student** — "After a session ends, I open Profile → My Study, find yesterday's notebook by session title, and reread my Thoughts to study for class."
2. **The cross-session synthesizer** — "I create a folder called 'Climate Series' and drag four notebooks into it so I can compare arguments across weeks."
3. **The cleaner** — "I multi-select five empty drafts and delete them in one tap."
4. **The republisher** — "I revisit a published Take, edit it, and unpublish it from the My Take tab — the card pill flips from Published to Draft on the list."
5. **The sharer** — "I send a friend a read-only link to my published Take from the share menu; they open it without an account."
6. **The renamer** — "A notebook auto-titled from a generic session name; I rename it 'Tariffs vs. Free Trade — round 2' so it's findable."
7. **The reorderer** — "Inside 'Climate Series' I drag my favorite notebook to the top so it's the first thing I see."
8. **The home-page returner** — "From the home page row I tap the latest notebook and jump straight back into My Take to keep writing."
9. **The searcher** — "I type 'tariffs' in the search bar and instantly see every notebook whose session title, Thoughts, Take, or annotation mentions it."
10. **The mobile reader** — "On my phone I long-press a card to enter multi-select, tap three drafts, and move them into a folder."

## Blindspots worth addressing now

- **Sharing scope**: a Take can be Published (public via profile) *and* link-shared. We need a separate `share_token` for read-only links so the user can share without making it appear on their public profile.
- **Folder uniqueness & ordering**: folders need an `order_index` and notebooks need `folder_id` + `sort_index`; otherwise reorder won't survive refresh.
- **A notebook can live in only one folder** (no multi-parent) — keeps mental model simple. "Uncategorized" is the implicit root.
- **Folder deletion**: deleting a folder must move its notebooks back to root, not orphan them. Confirm dialog states this.
- **Rename source of truth**: today the card title is the parent session title. Add a nullable `display_title` on `session_notebooks`; cards prefer `display_title` over session title. Rename never mutates the underlying session.
- **Multi-select UX**: sticky bottom action bar (Move to folder · Delete · Cancel). Long-press on mobile, checkbox on hover desktop, "Select" toggle in the toolbar always available.
- **Delete safety**: soft-delete with `deleted_at` + 30-day "Trash" view. Hard delete after that. Prevents the "I deleted my finals notes" panic.
- **Empty-but-not-blank notebooks**: a notebook is auto-created the first time the user opens the panel even if they type nothing. Filter these out by default unless `thoughts`/`my_take`/annotations are non-empty; show under "Hidden empty notebooks (N)" expander.
- **Conflict: same session opened from two devices**: `session_notebooks` is unique on `(session_id, user_id)`, so both devices already share one row. Auto-save uses last-write-wins; surface a small "saved just now" indicator to make this obvious.
- **Home row scope**: limit to 6 most-recently-edited notebooks with a `View all →` link to `/my-study`. Don't dump the whole library on Home.
- **Performance**: add `(user_id, updated_at desc)` index and `(user_id, folder_id, sort_index)` index. Search runs client-side over the user's own rows (already RLS-bounded).
- **Accessibility**: drag handles need keyboard alternative (`Move up`/`Move down` in the row menu). Multi-select supports shift-click range on desktop.
- **Notification noise**: do not notify on auto-save or rename. Notify only on Publish success and on share-link first open (optional, defer).
- **Public profile sync**: when a Take is unpublished, it disappears from the public profile immediately (already handled by RLS `published = true`).

## Where it lives

- **Route**: `/my-study` (list) and `/my-study/:notebookId` (detail editor).
- **Profile page**: insert a new row **above My Agenda** in the Activity section: `📓 My Study › ` (count badge).
- **Profile dropdown**: add "My Study" link.
- **Home page**: insert a row component **above "Find people to debate with"** titled "My Study" with a horizontal scroll of up to 6 recent notebook cards + `View all →`.
- **Notebook panel** (in-session): small `↗ Open in My Study` link in the panel header.

## Layout — list view

```text
┌──────────────────────────────────────────────────────────────────┐
│  My Study                                  [ Search 🔍       ]  │
│  Your private notebooks from every session.                      │
│                                                                  │
│  [ All · 24 ] [ Drafts · 18 ] [ Published · 6 ] [ Trash · 2 ]    │
│  ⌄ Sort: Newest    [ + New folder ]    [ Select ]                │
├──────────────────────────────────────────────────────────────────┤
│  ▾ 📁 Climate Series (4)                              ⋮          │
│     ┌─────────────────────────────────────────────────────┐ ⠿   │
│     │ ☐  Tariffs vs. Free Trade — round 2     · Published │     │
│     │    Apr 12 · 38 min · 4 annotations · #climate       │     │
│     │    "First two paragraphs of My Take preview…"       │     │
│     └─────────────────────────────────────────────────────┘     │
│     ┌─────────────────────────────────────────────────────┐ ⠿   │
│     │ ☐  Carbon credits panel               · Draft       │     │
│     └─────────────────────────────────────────────────────┘     │
│  ▸ 📁 Civics 101 (7)                                  ⋮          │
│                                                                  │
│  Uncategorized                                                   │
│  ┌──── notebook card ────┐ ┌──── notebook card ────┐             │
└──────────────────────────────────────────────────────────────────┘

When [Select] is on:
┌──────────────────────────────────────────────────────────────────┐
│ 3 selected   [ Move to folder ▾ ]  [ Delete ]   [ Cancel ]       │
└──────────────────────────────────────────────────────────────────┘  (sticky bottom)
```

- **Drag handle (⠿)** on each card for reorder; folders are drop targets. Within a folder, cards reorder freely. Drag a folder to reorder folders.
- **Card overflow menu (⋮)** per row: Open · Open session record · Rename · Move to folder · Share · Publish (if unpublished, links to My Take) · Delete.
- **Folder overflow menu (⋮)**: Rename · Reorder · Delete (confirms, returns notebooks to root).
- **Mobile (<768px)**: same list, full-width cards, filter chips horizontally scrollable; long-press = multi-select; drag handle becomes "Move…" in the row menu.

## Card anatomy

- **Title**: `display_title` if set, else parent session title, else "Untitled session" (Instrument Serif).
- **Eyebrow**: recorded date · duration · annotation count.
- **Status pill**: `Draft` (hairline) / `Published` (black filled) / `Shared` (small chain icon if a `share_token` exists).
- **Preview**: first ~140 chars of My Take → else Thoughts → else italic "No content yet".
- **Tags**: inherited session tags (max 3, +N overflow).
- **Click** → `/my-study/:notebookId` (detail editor).

## Detail view (`/my-study/:notebookId`)

```text
← Back to My Study

Title (editable inline pencil)               [ Open session record ↗ ]
Recorded Apr 12 · 38 min · in 📁 Climate Series
                                                       [ Share ▾ ]

[ Thoughts ] [ Annotations · 4 ] [ My Take ]   ← Chrome tabs
```

- Tabs reuse the same `ThoughtsTab`, `AnnotationsTab`, `MyTakeTab` components extracted from `NotebookPanel`.
- Auto-saves with the same 1s debounce.
- Inline rename (pencil icon next to title) → updates `display_title`.
- **Share menu**:
  - `Copy private link` — generates/uses `share_token`, opens at `/study/shared/:token` (read-only, no auth required).
  - `Copy session record link` — links back to the live session record.
- **Publish lives only in the My Take tab footer** (rule confirmed): `[ Publish to profile ]` / `[ Published ▾ ]` (View on profile · Unpublish).
- Annotations remain clickable: `↗` jumps to `/live/:sessionId#annotation-:id`.

## Search, filter, sort

- **Filter chips**: All · Drafts · Published · Trash.
- **Sort**: Newest activity (default), Oldest, Session date, Most annotations, Manual (only enabled inside a folder; sticks to `sort_index`).
- **Search**: client-side fuzzy across `display_title`, session title, Thoughts text, My Take, annotation excerpts/notes, folder name, tags.
- URL state: `/my-study?filter=published&sort=annotations&q=climate&folder=<id>`.

## Home page integration

- Component: `HomeMyStudyRow` placed above the `FollowSuggestions`/"Find people to debate with" block in `HomePage.tsx`.
- Layout: serif heading "My Study" + subhead "Pick up where you left off." + horizontally-scrolling row of up to 6 recent notebook cards (compact variant, no overflow menu) + `View all →`.
- Empty state: small inline card "Start a notebook from any session record" linking to `/my-debates`.

## Data model changes (migrations)

```sql
-- Folders
create table public.notebook_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  sort_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notebook_folders_user_idx on public.notebook_folders (user_id, sort_index);

alter table public.notebook_folders enable row level security;
create policy "owner can crud folders" on public.notebook_folders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Extend session_notebooks
alter table public.session_notebooks
  add column display_title text,
  add column folder_id uuid references public.notebook_folders(id) on delete set null,
  add column sort_index int not null default 0,
  add column share_token text unique,
  add column deleted_at timestamptz;

create index session_notebooks_user_updated_idx
  on public.session_notebooks (user_id, updated_at desc) where deleted_at is null;
create index session_notebooks_user_folder_sort_idx
  on public.session_notebooks (user_id, folder_id, sort_index) where deleted_at is null;
```

- **Read-only share RPC** `get_shared_notebook(_token text)` (SECURITY DEFINER) returns notebook + session title for `/study/shared/:token`. Mirrors `get_shared_live_session`.
- **Soft-delete behavior**: list filters `deleted_at is null` by default; Trash chip queries the inverse. Scheduled hard-delete after 30 days deferred to a later cron job (out of scope here).
- **RLS on existing `session_notebooks`** already owner-scoped; new columns inherit. The public-via-published policy stays as-is.

## Components & hooks

- `src/pages/MyStudyPage.tsx` — list, filter/sort/search, multi-select bar, drag-and-drop.
- `src/pages/MyStudyDetailPage.tsx` — single-notebook editor with tabs, rename, share menu.
- `src/pages/SharedNotebookPage.tsx` — read-only `/study/shared/:token`.
- `src/components/study/NotebookCard.tsx` — list row (full + compact variants).
- `src/components/study/FolderRow.tsx` — collapsible folder with drop target.
- `src/components/study/StudyFilterBar.tsx` — chips, sort, search, Select toggle, New folder.
- `src/components/study/MultiSelectActionBar.tsx` — sticky bottom bar.
- `src/components/study/ShareMenu.tsx` — copy private link, copy session link.
- `src/components/home/HomeMyStudyRow.tsx` — home page row.
- Extract from `NotebookPanel.tsx`:
  - `src/components/live/record/notebook/ThoughtsTab.tsx`
  - `src/components/live/record/notebook/AnnotationsTab.tsx`
  - `src/components/live/record/notebook/MyTakeTab.tsx`
- Hooks: `src/hooks/useMyStudy.ts` (list + hydrate session titles/tags/counts/folders), `src/hooks/useNotebookFolders.ts`, `src/hooks/useNotebookReorder.ts` (dnd-kit wrapper), extend `useSessionNotebook.ts` to load by `notebookId`.

## Drag-and-drop

- Use `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible, already common in the React ecosystem). Keyboard reorder via row menu (`Move up` / `Move down` / `Move to folder…`).

## Visual style (dynamo)

- Pure white bg, hairline 0.5px borders, Instrument Serif titles, DM Sans body.
- Status pills: `Draft` = white + hairline + muted text; `Published` = black bg + white text; `Shared` = small chain glyph + muted text.
- Folder header: serif medium, chevron, count in parentheses; subtle hover bg `rgba(0,0,0,0.03)`.
- Drag handle (⠿) appears on hover; sticky multi-select bar uses black bg + white text.
- Filter chips: pill, active black/white, inactive white/black with hairline.

## Routing & nav

- Add `/my-study`, `/my-study/:notebookId`, `/study/shared/:token` to `App.tsx`. Owner routes wrapped in `<ProtectedRoute>`.
- Update `ProfilePage.tsx` Activity section: insert My Study row **above** My Agenda.
- Add `My Study` to profile dropdown.
- Update `HomePage.tsx`: insert `HomeMyStudyRow` above the "Find people to debate with" block.

## Build order

1. Migrations: `notebook_folders`, `session_notebooks` columns, indexes, `get_shared_notebook` RPC.
2. Extract `ThoughtsTab`/`AnnotationsTab`/`MyTakeTab` from `NotebookPanel.tsx` (no behavior change).
3. `useMyStudy` + `useNotebookFolders` hooks (list, hydrate, soft-delete-aware).
4. `MyStudyPage` shell + `NotebookCard` + filter chips + sort + search.
5. Folders: create, rename, delete (with notebooks-return-to-root), expand/collapse.
6. Drag-and-drop reorder (dnd-kit) + keyboard fallback.
7. Multi-select toolbar: Move to folder, Delete (soft), Cancel.
8. `MyStudyDetailPage` with tabs, inline rename, Share menu.
9. `SharedNotebookPage` (read-only).
10. Home page `HomeMyStudyRow` + Profile page row + nav links + dropdown entry.
11. Trash filter view + restore action.
12. Mobile pass: long-press multi-select, swipe, horizontal chip scroll.

## Out of scope (explicit)

- Server-side full-text search.
- Cron-based hard-delete of trashed items (manual delete from Trash works).
- Sharing drafts publicly via profile (only Published Takes appear there).
- Cross-user collaborative notebooks.
- Notebook templates or AI auto-organize-into-folders.

