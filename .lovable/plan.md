## Goal
Replace the current YouTube-style chip-filter + uniform grid on `/explore` with a richer browse surface: one featured hero at the top, then a stack of horizontal "shelves" — one per tag/category — each scrolling a high-density row of record cards. A sticky search affordance follows the user as they scroll.

## New layout

```text
┌──────────────────────────────────────────────────────────────┐
│ [🔍 floating search pill — fixed top-left, always visible]   │
│                                                              │
│   Explore                                                    │
│                                                              │
│   ┌────────────────────────────────────────────────────┐    │
│   │  FEATURED  ·  LIVE NOW                             │    │
│   │  Big cover · topic · publisher · participants      │    │
│   │  [Join / Open]                                     │    │
│   └────────────────────────────────────────────────────┘    │
│                                                              │
│   #philosophy                                  See all →     │
│   ◀ [card][card][card][card][card][card][card] ▶            │
│                                                              │
│   #politics                                    See all →     │
│   ◀ [card][card][card][card][card][card][card] ▶            │
│                                                              │
│   #science                                     See all →     │
│   ◀ [card][card][card][card][card][card][card] ▶            │
│   …                                                          │
└──────────────────────────────────────────────────────────────┘
```

## Sections

1. **Floating search pill** — fixed `top-4 left-4`, circular icon-only at rest, expands inline to an input on focus/click. Stays visible while scrolling. Replaces the inline search field.
2. **Featured hero** — single record (live > trending > latest). Large cover, topic in Instrument Serif, publisher + participant count, status pill, primary CTA. Subtle gradient overlay, ~40vh on desktop, shorter on mobile.
3. **Tag shelves** — one horizontal row per visible tag (official tags + any tag with ≥1 record). Each shelf:
   - Header: `#tagname` + count + `See all →` (links to `/topic/:slug` or filtered view).
   - Horizontal scroller of compact, high-density cards (smaller than current Explore cards, ~5-6 visible on desktop, snap-x, scrollbar hidden, chevron buttons on hover like `AutoCarousel`).
   - Hidden if the shelf has 0 records.
4. **"Uncategorized / Latest" shelf** at the bottom for records without tags.
5. **Search results mode** — when the floating search has a query, replace shelves with a single dense grid of matching records across all tags (same compact card).

## Card design (high-density)

- Width ~160-180px on desktop, ~140px on mobile, 4:5 cover aspect.
- Cover image with subtle inner shadow; status badge top-left (LIVE / IMPORTED / SCHEDULED).
- Two lines: topic (DM Sans medium, 13px, clamp-2) + publisher name (12px muted).
- No participant count on the compact card — moved to hover tooltip / hero only.
- Imported records keep the "Imported" pill.

## Data wiring

- Reuse `useFeaturedDebates(1)` for hero.
- New hook `useTagShelves()`:
  - Pulls visible tags from `useAllTags()` (official OR `debate_count > 0`).
  - For each tag, fetches up to ~12 records (debates + imported_records) via existing `debate_tags` / `live_session_tags` joins, mapped through existing `mapDebate` / `mapImported` shape. Reuse the imported-record fetch already in `useExplore.ts`.
  - Returns `{ tag, items }[]`, filtered to shelves with `items.length > 0`.
- Search uses the existing merged-all pool (featured + trending + latest) like today.

No backend / RLS / schema changes — purely a frontend redesign of `ExplorePage.tsx` plus a new shelf component and a new compact card variant.

## Files

- `src/pages/ExplorePage.tsx` — rewrite layout (hero + shelves + floating search + search-results grid).
- `src/components/explore/FloatingSearch.tsx` (new) — fixed pill, expand-on-click.
- `src/components/explore/FeaturedHero.tsx` (new) — featured record block.
- `src/components/explore/TagShelf.tsx` (new) — header + horizontal snap scroller with chevrons (pattern from `AutoCarousel`, manual nav only).
- `src/components/explore/CompactRecordCard.tsx` (new) — high-density card variant (reuses routing logic from `DebateCoverCard`).
- `src/hooks/useTagShelves.ts` (new) — fetches per-tag record lists.

## Out of scope

- No changes to the underlying chip taxonomy / tag CRUD.
- No changes to `/topic/:slug` (the `See all` destination already exists).
- No backend, RLS, or schema work.
- No changes to Home page or other surfaces.

## Notes

- All colors/spacing via existing semantic tokens (`bg-background`, `text-foreground`, `border-border`). No raw hex.
- Mobile: floating search collapses to icon; shelves remain horizontal scrollers (touch-native), chevrons hidden < `sm`.
- Respect `prefers-reduced-motion` on any shelf scroll animation.
