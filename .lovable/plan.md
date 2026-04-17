

# Plan: Home page redesign (revised)

## A. Schema (one migration)
- `profiles.banner_url text null`
- `debates.cover_image_url text null`

## B. Top section — greeting + persistent tagline
Single fixed-height slot:
1. **Greeting `h2`** "Good evening, {display_name}." — fades out after 3.2s and is **replaced in place** by the X-style header (banner + avatar + display name + @handle). `[p]` tagline stays visible the entire time, never fades.
2. **Tagline `[p]`** rotates every 5s through:
   - "What's the story today?"
   - "What do you want to debate today?"
   - "People to the power!"
   - "Got a take? Put it to the test."
   Persists below greeting, then below header. Crossfade between messages only (the `<p>` slot itself never disappears).

## C. Action row
2-column grid: **Create** (PlusCircle → `/create`) + **Live** (Radio → `/live`). Same card style as today.

## D. Two carousels

### 1. "Conversations that may concern you"
- Header row: title left · `Trending | Local` toggle pill · **"Open" arrow button top-right** → navigates to `/for-you`.
- Source: live public debates first, then most-engaged public debates (participant count desc). `Local` filters by `profile.location`.

### 2. "My Recent" (NEW, replaces old Recent list)
- Header row: title left · **"Open" arrow button top-right** → navigates to `/my-recent`.
- Source: debates where the current user is creator or participant, ordered by `updated_at` desc.

### Carousel mechanics (shared)
- Cards: aspect 16/10, rounded-xl, 0.5px border. Background = `cover_image_url` else gradient hashed from topic. LIVE chip with pulsing green dot, participant count pill, topic in Instrument Serif (clamp-2).
- Auto-advance 1 card every 5s, wraps. Arrow buttons at edges. Any user interaction (arrow, drag, scroll, focus) pauses auto-advance; resumes after **10s of inactivity**. Honors `prefers-reduced-motion`.
- 1 card on mobile, 2 on md, 3 on lg.

## E. Two new expanded pages
- `/for-you` — full catalogue of the trending/local set. Top bar: back arrow (left) · page title · **"Explore →" link top-right** (this is where the Explore link lives now). Same Trending/Local toggle. Grid layout (responsive 1/2/3 columns).
- `/my-recent` — same shell, lists user's debates. Top-right also shows "Explore →".

Both pages reuse the same card component as the carousel.

## F. Files
- **Migration**: 2 nullable columns.
- **NEW** `src/components/home/GreetingHeader.tsx` — greeting → X-style header swap (tagline lives outside, in HomePage).
- **NEW** `src/components/home/RotatingTagline.tsx` — 4-message crossfade.
- **NEW** `src/components/home/DebateCoverCard.tsx` — shared card (carousel + grid pages).
- **NEW** `src/components/home/AutoCarousel.tsx` — fetch-agnostic carousel shell with auto-advance + pause-on-interaction.
- **NEW** `src/pages/ForYouPage.tsx`, `src/pages/MyRecentPage.tsx`.
- **NEW** `src/lib/gradient.ts` — deterministic gradient util.
- **EDIT** `src/pages/HomePage.tsx` — compose new sections.
- **EDIT** `src/App.tsx` — register `/for-you` and `/my-recent` routes (protected).

## G. Self-check
- [ ] Only `h2` fades; `[p]` tagline never disappears and keeps cycling.
- [ ] Header (banner + avatar + name + @handle) replaces greeting in place, no layout jump.
- [ ] Create + Live side-by-side.
- [ ] Two carousels, each with top-right "Open" button to a dedicated catalogue page.
- [ ] Catalogue pages have back arrow + Explore link top-right.
- [ ] Auto-rotate 5s, pause on interaction, resume after 10s.
- [ ] Build passes; routes work; gradient fallback renders when cover/banner null.

