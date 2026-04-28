# Make Explore feel like YouTube's Explore

Reshape `src/pages/ExplorePage.tsx` so the dominant pattern is: a sticky horizontal **category chip bar** at the top, then a **dense grid of large cover-image cards** (3 per row on desktop), keeping our monochrome brand and existing data hooks.

## What changes (visual)

```text
┌─────────────────────────────────────────────────────┐
│  Explore                              [🔍 search]   │
├─────────────────────────────────────────────────────┤
│ [All][Today][Live][Latest][#politics][#tech][#…] →  │  sticky chip bar, h-scroll
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  cover   │  │  cover   │  │  cover   │           │  3-col grid (md+),
│  └──────────┘  └──────────┘  └──────────┘           │  2-col (sm), 1-col (mobile)
│   Topic title    Topic title    Topic title         │
│   pub · 12 spk   pub · 8 spk    LIVE · 4 spk        │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  …       │
└─────────────────────────────────────────────────────┘
```

- **Chip bar**: horizontally-scrollable row of pills, scrollbar hidden, fades on edges. Active pill is filled (`bg-foreground text-background`), inactive is outlined (`border-border text-foreground`). Includes built-in chips `All`, `Live`, `Today`, `Latest`, then one chip per visible tag (`#name`).
- **Grid**: replaces the current Featured / Today / Latest / Topics stack. One unified grid. Reuses `DebateCoverCard` (already 16:10 cover with gradient, status pill, title overlay) — same visual language as Home, which is closer to YouTube's video-card density than the current text rows.
- **Card meta line** (under each cover, new): `publisher · N speakers` or `LIVE · N speakers`. Small DM Sans, muted.
- **Search**: kept, slightly smaller, right-aligned next to the title on desktop; full-width on mobile. Typing collapses the chip bar and shows search results in the same grid.
- **"More to explore" tag tiles section is removed** — tags are promoted into the chip bar, matching YouTube's pattern.

## What changes (data)

No schema or hook changes. Source data from existing hooks already in the file:

- `All` chip → merged & de-duped `[...featured, ...trending, ...latest]`
- `Live` chip → filter merged list by `status === "live"`
- `Today` chip → `useTrendingDebates(24)` results
- `Latest` chip → `useLatestDebates(24)` results
- Tag chip → `useDebatesByTag(tagId, 30)` (already exported from `src/hooks/useExplore.ts`)

Selected chip is local component state. Switching chips swaps the array fed into the grid; no route change.

Mobile chip bar uses the same hidden-scrollbar pattern as `AutoCarousel` (`[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`).

## Files touched

- `src/pages/ExplorePage.tsx` — rewrite layout: header row, chip bar, unified grid using `DebateCoverCard`, meta line beneath cards. Drop `FeaturedCard`, `CompactCard`, `ListRow`, `SectionHeader`, "More to Explore" tag grid.
- No other files. `useExplore.ts`, `useTags.ts`, and `DebateCoverCard.tsx` are reused as-is.

## Out of scope

- Sidebar nav, dark theme (we stay light/monochrome — YouTube's dark chrome is not adopted).
- Video thumbnails (we keep our gradient/cover-image system).
- Channel avatars on every card (publisher name only, matching our existing density).
