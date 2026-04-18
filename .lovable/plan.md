
## Mobile Responsiveness Plan — Approved Decisions

**Decisions locked in:**
1. No 4th Create tab — keep mobile bottom nav as Home / Explore / Profile.
2. Ship all 5 phases in one pass; self-verify each phase and report a % accuracy until all phases reach 100%.
3. Debate Room / Live Session — overflow-only fixes (safest).
4. Inputs use `text-base` (16px) on mobile to prevent iOS zoom; revert to `sm:text-sm` at `sm+`.

## Phased work (largest → smallest)

### Phase 1 — App shell
- `AppLayout.tsx`: standardize bottom nav to `h-16`, bump touch targets to ≥44×44, ensure `pb-20` clears nav on every page.
- Audit `BulkActionBar` and EditProfile sticky save bar offsets so they consistently sit above the nav.

### Phase 2 — Page containers
- `HomePage`: greeting `text-2xl sm:text-[28px]`, stack Avg cluster below name on `<sm`.
- `ExplorePage`: progressive grid `1 → sm:2 → md:3`; tighten gaps on mobile.
- `ProfilePage` / `MyDebatesPage`: shrink headers on mobile, prevent row crowding; tab labels `text-xs sm:text-sm`.
- `MyRecentPage` / `ForYouPage`: full-width segmented control under `sm`; ensure padding clears nav + bulk bar; "See all" CTA ≥44px.
- `EditProfilePage`: banner `aspect-[5/2]` on mobile; reflow avatar + helpers vertically; align save bar to standardized offset.
- `CreateDebatePage`: prevent select/chip overflow; wrap inviter chips.

### Phase 3 — Composite components
- `AutoCarousel`: hide arrows `<sm`, `sm:flex` to show.
- `DebateCoverCard`: ⋯ trigger `w-9 h-9 sm:w-7 sm:h-7`; reflow chips so pill + ⋯ + participant count never collide on narrow cards.
- `BulkActionBar`: icon-only under `sm`, icon+label at `sm+`; cancel left, destructive right.
- `GreetingHeader`: stack avg block under name on `<sm`; avoid avatar clip.

### Phase 4 — Primitives & input hygiene
- `Input` and `Textarea`: `text-base sm:text-sm`.
- All icon-only buttons: `min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0`.
- Verify focus rings stay visible in both themes.

### Phase 5 — Self-verification across breakpoints
Use the browser tool at the following widths and report % accuracy per phase until 100%:

| Width | Pages |
|---|---|
| 320 | Home, Profile, EditProfile, Explore, MyRecent, ForYou, MyDebates, Create, Auth |
| 375 | Same + open ⋯ menu, bulk select, see-all |
| 414 | Same |
| 768 | Sidebar hidden, grid transitions |
| 1024 | Sidebar visible, multi-col grids |
| 1366 | Desktop unchanged |

For each width verify: (1) no horizontal scroll, (2) tap targets ≥44px, (3) sticky bars don't cover content, (4) no critical truncation, (5) dark mode legible. Iterate fixes until each phase scores 100%.

## Files to edit
- `src/components/AppLayout.tsx`
- `src/components/home/GreetingHeader.tsx`
- `src/components/home/AutoCarousel.tsx`
- `src/components/home/DebateCoverCard.tsx`
- `src/components/home/BulkActionBar.tsx`
- `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`
- `src/pages/HomePage.tsx`, `ProfilePage.tsx`, `ExplorePage.tsx`, `MyDebatesPage.tsx`, `MyRecentPage.tsx`, `ForYouPage.tsx`, `EditProfilePage.tsx`, `CreateDebatePage.tsx`

No DB / RLS changes. No design-token changes. `DebateRoomPage` and `LiveSessionPage` get overflow-only audits.

## Self-check
- [x] Mobile nav stays 3-tab as requested
- [x] Single pass with self-verification loop until 100%
- [x] Debate Room / Live Session limited to overflow audit
- [x] 16px inputs on mobile to defeat iOS zoom
- [x] Tailwind built-in breakpoints only (`sm`/`md`/`lg`/`xl`)
