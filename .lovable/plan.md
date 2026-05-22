## Goal

Three small, related changes on the homepage rows:

1. Add the same glass-style edge arrows (`EdgeArrow` + `useEdgeScroll`) used on Explore/AutoCarousel to the "Find people" and "My Study" rows on `/`.
2. Redesign the My Study cards as vertical, book-like hero cards with a gradient cover by default.
3. Fix the HTML-tag leak in the notebook preview (`<p></p><ul><li>…`).

## Changes

### 1. `src/hooks/useMyStudy.ts` — strip HTML in preview

- Add a small `stripHtml(s)` helper inside the file: replace `<br>` with newlines, drop other tags, decode `&nbsp;` / `&amp;` / `&lt;` / `&gt;` / `&quot;` / `&#39;`, collapse whitespace.
- Use it inside `notebookPreview` for both `my_take` and `thoughts.blocks[0].value`.
- Update `isNotebookNonEmpty` to also strip HTML when checking the thoughts string so a notebook containing only `<p></p>` is still treated as empty.

### 2. `src/components/home/HomeMyStudyRow.tsx` — vertical hero cards + arrows

Card redesign (book-like):
- Replace the current short, wide card with a vertical card sized like a book: `w-[170px] sm:w-[180px]` and `aspect-[3/4]` (≈ 240px tall).
- Card structure (column flex):
  - Top: a gradient "cover" header that fills most of the card. Background uses `monoGradientFromSeed(notebook id or title)` (already used elsewhere). If the notebook ever has a cover image, fall back to that (none today — gradient is the default).
  - Bottom overlay area on the cover: title rendered in `font-display` Instrument Serif, white-ish text on the gradient, 2-line clamp.
  - Below the cover (small fixed strip): "My Thoughts" label (uppercase 10px tracked, muted) + 2-line clamp of the cleaned preview text.
- Keep the existing top-right Published/Draft chip, but make it absolute-positioned on the cover (top-right) so the cover can fill the card.
- Keep the date · annotation count line as a tiny meta line under the title preview.

Row arrows:
- Wrap the horizontal scroller in a `relative` container, attach a ref, drive `useEdgeScroll` to compute `canLeft`/`canRight`, and render two `EdgeArrow`s with `onClick` calls that do `scrollBy({ left: ±cardWidth, behavior: "smooth" })`.
- Keep the existing snap/overflow/hidden-scrollbar styling.

### 3. `src/components/home/FindPeopleRow.tsx` — arrows

- Same pattern: wrap the existing scroller in a `relative` container with a ref, use `useEdgeScroll`, render left/right `EdgeArrow`s. No card design changes.

## Out of scope

- The `/my-study` index page card design (this only updates the homepage row card).
- Allowing user-uploaded notebook covers — keep gradient as the only default.
- Any backend/RLS or data changes.
