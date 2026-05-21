# Polish the Explore shelves

Two small but visible issues on `/explore`:

1. **Page-level horizontal scrollbar appears** when the sidebar expands. Cards that no longer fit push the whole page wider instead of being absorbed into the shelf's own horizontal scroller + edge-arrow preview.
2. **"See all"** sits at the far right of the row, visually disconnected from its `#Tag` title.

## What changes

### 1. Kill the page-level horizontal scroll

Goal: only the **shelf scrollers** ever scroll horizontally. The page itself never does. Off-screen cards become the "preview peek" reached only via the translucent edge arrow.

- `src/components/AppLayout.tsx` — add `min-w-0 overflow-x-hidden` to the `<main>` element. Flex children default to `min-width: auto`, which lets wide inner content (like the shelves' `flex` row of cards) inflate the main column and produce a page scrollbar. `min-w-0` lets `flex-1` actually constrain width; `overflow-x-hidden` is a belt-and-suspenders guarantee.
- `src/pages/ExplorePage.tsx` — add `min-w-0` to the inner `max-w-7xl` wrapper for the same reason (it sits inside another flex/flow context).
- Each shelf's outer `<section className="relative">` (TagShelf, CompactShelf, FeaturedRow) — add `min-w-0 overflow-hidden` on the `relative` wrapper that contains the scroller, fades, and edge arrows, so partial cards are clipped at the section edge and only become visible via the arrow.
- Verify FeaturedCard's responsive width tokens still resolve correctly inside the now-strictly-bounded container; no change to card widths themselves.

Result: when the user expands the sidebar, cards that would extend past the new viewport simply disappear behind the right-edge fade, and the translucent right arrow becomes active to reveal them. No browser-level horizontal scrollbar ever appears.

### 2. Move "See all" next to the tag name

`src/components/explore/TagShelf.tsx` — collapse the split header into a single left-aligned cluster:

```text
#Politics  4   See all →
```

- Remove the right-side `<Link>See all →</Link>`.
- Inside the existing left-side `<Link>` group, append a small `See all →` affordance after the count, styled as muted body text that brightens on hover (matches current "See all" style).
- Header container becomes `flex items-baseline gap-2` (drop `justify-between`).

`CompactShelf` ("Latest") has no "See all" target, so its header is unchanged.

## Out of scope

- No changes to card sizing, scroll snap behavior, or arrow visuals.
- No changes to `FeaturedRow`'s toggle pill placement (it stays on the right of the Featured header, since it's a control, not a navigation link).
- No data, RPC, or routing changes.
