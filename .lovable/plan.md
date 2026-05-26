## 1. Make `/clubs` feel like `/explore`

Refactor `src/pages/ClubsPage.tsx` so it shares Explore's editorial layout, floating search, and horizontal shelves instead of the current chip-bar + single grid.

**Layout (top → bottom)**
- `AppLayout` wrapper (unchanged).
- `FloatingSearch` mounted top-right (same component Explore / My Study / My Agenda use) — replaces the inline search input.
- Editorial header: `font-display text-3xl sm:text-4xl` "Clubs" with a muted subline ("Find communities to join, host, and debate with."). A small "Create Club" pill stays in the header for logged-in users.
- Horizontally-scrolling shelves, each a row of `ClubCoverCard`s with edge fades + arrow buttons, in this order:
  1. **Featured** — `c.is_featured`
  2. **Near you** — clubs whose `location` matches the user's `profile.location` (hidden if no profile location)
  3. **My Clubs** — `c.is_member` (logged-in only)
  4. **Public** — `c.is_public`
  5. **Private / Invite-only** — `!c.is_public` the user can see
- Search mode: when `FloatingSearch` has a query, hide the shelves and render a single responsive grid of matching clubs (name + description match), mirroring Explore's "Results for …" pattern.
- Empty state: dashed-border card identical in tone to Explore.
- `LegalFooter` at the bottom (matches Explore).

**New component**
- `src/components/clubs/ClubShelf.tsx` — same shape as `CompactShelf` (uses `useEdgeScroll` + `EdgeArrow` + the left/right gradient fades), but renders `ClubCoverCard`s inside fixed-width snap items (`w-[260px] sm:w-[300px]`) so horizontal scroll works cleanly.

**Removed**
- The existing chip bar (`All / My Clubs / Public / Private`) — the shelves replace it.

**No data-model or hook changes.** Everything is driven by the existing `useClubs()` result.

## 2. Swap "For You" / "Local" toggle

Both `src/pages/HomePage.tsx` and `src/pages/ForYouPage.tsx` currently render `[For You | Local]`. Update both so:
- Order becomes `[Local | For You]` (Local on the left, For You on the right).
- Default `mode` is `"local"` when the user has a saved `profile.location`; otherwise it falls back to `"trending"` so users without a location aren't shown an empty default.
- Tapping Local without a location still opens the existing `LocationPrompt` (no change to that flow).
- No changes to `useForYouDebates` or data fetching.

## Files touched
- `src/pages/ClubsPage.tsx` — rewritten to Explore-style layout
- `src/components/clubs/ClubShelf.tsx` — new (Explore-style horizontal shelf for clubs)
- `src/pages/HomePage.tsx` — swap toggle order + default
- `src/pages/ForYouPage.tsx` — swap toggle order + default
