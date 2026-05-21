# Explore — Format filter (All / Debates / Live / CMM / Imported)

Add a multi-select format filter that sits to the left of the For You / Local toggle in the Featured row header but applies **globally** to every shelf on `/explore` (Featured, all TagShelves, Latest, and search results).

## UI

`src/components/explore/FormatFilter.tsx` (new)

- shadcn `DropdownMenu` trigger styled to match the For You/Local pill: rounded-full border `border-border/60`, `bg-foreground/5 backdrop-blur-xl`, `px-3.5 py-1.5 text-[12px] font-body`.
- Label logic:
  - All selected (or none) → `All formats ▾`
  - 1 selected → `Debates ▾`
  - 2+ selected → `Debates +2 ▾`
- Menu contains 5 `DropdownMenuCheckboxItem`s: **All**, **Debates**, **Live**, **Change My Mind**, **Imported**.
  - **All** is a master toggle: clicking it selects everything / clears to All-state. Toggling any individual item off "All" deselects All and leaves only that item.
  - Selecting all 4 individuals auto-flips back to All.

## Global state

`src/contexts/ExploreFiltersContext.tsx` (new) — lightweight context exposing:

```ts
type Format = "debate" | "live" | "cmm" | "imported";
{ formats: Set<Format> | "all"; setFormats; isAll: boolean; matches: (item) => boolean }
```

Persisted in `localStorage` (`explore.formats`). Default = `"all"`.

`matches(item)` classifies an `ExploreDebate`/`ExploreLiveSession`:

- `kind === "imported_record"` → `imported`
- live-session item (from `useLiveSessionsByTag`) → `live`
- debate with `status === "live"` → `live`
- debate where the row's record type is CMM → `cmm` (see Technical below)
- otherwise → `debate`

## Wiring

- `ExplorePage.tsx`: wrap content in `<ExploreFiltersProvider>`. Apply `matches` as a `.filter()` over: `trending`, `latest`, `shelves[i].items`, and `searchResults`. Hide a shelf if it becomes empty post-filter (preserves the "nothing janky" feel rather than showing empty rows).
- `FeaturedRow.tsx`: render `<FormatFilter />` to the left of the existing toggle pill (`flex items-center gap-2`). Apply filter to `items` from `useFeaturedRow` before render; if the filtered list is empty, show a single muted line "No featured records match this filter."

## Technical

- **CMM detection**: `useExplore.ts` currently selects from `debates` without a format column. Extend `DEBATE_SELECT` to include a discriminator. Two options, pick whichever already exists in schema (verify before coding):
  1. If `debates.format` / `debates.kind` column exists → add it to select + `mapDebate`.
  2. Otherwise, left-join `change_my_mind_sessions` (or whatever table backs CMM rooms) keyed on `debate_id`, set `kind: "cmm"` when present.
  This is the only data-layer change; no migrations, no RLS changes.
- `ExploreDebate.kind` union expands to `"debate" | "live" | "cmm" | "imported_record"`. The Live-session shelves keep their own type — filter handles both via `matches`.
- No new RPC; filtering happens client-side over already-loaded items (Explore shelves cap at 16–24).

## Out of scope

- No change to card visuals, edge-arrow scroll, or shelf ordering.
- No server-side filter / pagination changes.
- No new routes.  
  
