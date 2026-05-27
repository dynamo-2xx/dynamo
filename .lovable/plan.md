## Goal

Add a second view to `/explore`: a single-column doom-scroll of public **My Takes** (tweet-style) and published **Notebooks** (hero cards). Toggle in-place via a new floating button stacked below the existing search button. Left nav and floating search are unchanged.

```
Records view (current)              Feed view (new)
┌──────────────────────────┐        ┌──────────────────────────┐
│ [nav] ...featured/tag... │        │ [nav]                    │
│                  [🔍]    │  ←→    │       ┌──Composer──┐  [🔍]│
│                  [📓]    │        │       │ take + 📓+ │  [📑]│
│                          │        │       └────────────┘     │
│                          │        │       [My Take card]     │
│                          │        │       [Notebook hero]    │
│                          │        │       ... ∞ scroll       │
└──────────────────────────┘        └──────────────────────────┘
```

Button icons: `BookOpen` to switch into feed, `LayoutGrid` to switch back. Same slot, same float stack.

## Behavior

- **Toggle**: client state in `ExplorePage` (`view: "records" | "feed"`). No URL change. Toggle button sits below `FloatingSearch` in the same fixed stack at top-right.
- **Tabs above the composer**: `For you` (default) / `Local` — mirrors the Home For-You concept.
  - *For you*: globally popular (likes + comments + recency) + items by users I follow.
  - *Local*: locally popular (filter by `location` matching the viewer's city/region from `profiles`) + items by people I follow who share the location.
- **Composer at top**:
  - Textarea "Share a take…" → publishes a standalone **My Take** (no parent record required).
  - Trailing button `[+ Notebook]` opens a tiny picker → choose any record (debate / live / CMM / imported) you own a notebook for → opens the existing notebook detail and offers Publish, OR drops you into a quick "new notebook on this record" flow.
- **Feed item types**:
  - **My Take** → tweet-style card: avatar, name, time, body (4-line clamp + expand), like / comment / share counts.
  - **Notebook** → reuse `NotebookHeroCard` styling (cover gradient, title, "in response to &nbsp;" badge).
- **Infinite scroll** with cursor pagination on `(published_at desc, id desc)`. Page size 20.
- **Empty states**: For You empty → "Follow people or publish a take to see this feed light up." Local empty → "Nobody nearby is publishing yet."

## Data model

Notebooks already support `published = true`; reuse for the notebook stream.

For **standalone My Takes**, add a new public table:

```text
public.takes
  id uuid pk
  author_id uuid (auth user)
  body text (<= 2000 chars)
  parent_take_id uuid null   -- replies later, not v1
  like_count int default 0
  comment_count int default 0
  is_public bool default true
  location text null         -- snapshot of author location at publish time
  created_at timestamptz default now()
  updated_at timestamptz
```

- RLS: SELECT to `anon` + `authenticated` when `is_public`; INSERT/UPDATE/DELETE only when `author_id = auth.uid()`. GRANTs per project rules (anon SELECT, authenticated CRUD, service_role ALL).
- Index: `(created_at desc)`, `(author_id, created_at desc)`, `(location, created_at desc)`.
- This intentionally deviates from the existing My-Study-v2 rule "notebooks/takes are never standalone" — explicitly approved by user for this feed. (Notebook-attached takes continue to live inside notebooks unchanged.)

## Files

- `**src/components/explore/FloatingViewToggle.tsx**` (new) — fixed-position button stacked below `FloatingSearch`. Accepts `view`, `onToggle`. Swaps icon `BookOpen` ↔ `LayoutGrid`.
- `**src/pages/ExplorePage.tsx**` — add `view` state, render either current records JSX or the new `<FeedView/>`, mount toggle button.
- `**src/components/explore/feed/FeedView.tsx**` (new) — owns the For You / Local tab, composer mount, infinite list.
- `**src/components/explore/feed/TakeComposer.tsx**` (new) — textarea + publish button + notebook picker trigger.
- `**src/components/explore/feed/TakeCard.tsx**` (new) — tweet-style item.
- `**src/components/explore/feed/FeedNotebookCard.tsx**` (new, thin) — wraps `NotebookHeroCard` for read-only public render.
- `**src/components/explore/feed/NotebookPickerDialog.tsx**` (new) — lists user's notebooks (or "+ new from record") to publish.
- `**src/hooks/useFeed.ts**` (new) — merges paginated `takes` + published `notebooks` queries, supports `mode: "for_you" | "local"`.
- `**src/hooks/useTakes.ts**` (new) — create / list / like takes.
- Migration: create `public.takes` table with RLS, GRANTs, indexes; (no FK to `auth.users`).
- `mem://features/my-study-v2.md` — add a short note that the Explore Feed allows standalone takes (carve-out).

## Out of scope (v1)

- Reposts / quote-takes No reposts/quote-takes
- Threaded replies on takes (parent_take_id column reserved) 
- Right-rail widgets ("Top Notebooks", "People to follow") none for now.
- Media uploads inside a take (text only) Users can write a caption for their notebooks when publishing them that can accompany the hero  card. 
- Mobile-specific bottom-tab for the toggle (uses same floating button) Yes. Do that