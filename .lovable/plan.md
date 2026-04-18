
Tackling tasks 1, 2, 5, 9. All four are scoped and low-risk.

**1. Leaked-password protection**
Enable HIBP check via auth config (`password_hibp_enabled: true`). Single config call, no UI.

**2. Live sessions public SELECT**
Current policy: `auth.uid() = created_by` only. Migration to drop and recreate as:
```sql
USING (auth.uid() = created_by OR is_public = true)
```
This lets others see public live sessions. The existing `share_token` flow (via `get_shared_live_session` RPC) is unaffected since it's SECURITY DEFINER.

Also need to verify `useHomeDebates` Trending query for live sessions filters `is_public = true` so we don't suddenly show private ones from others (already filters on `created_by = user.id` for "My Recent" — fine; but need to check Trending live_sessions branch).

**3. Task 5 — `index.html` SEO polish**
Current `index.html` is missing OG image, Twitter handle, and has no canonical. Need to:
- Add `<meta property="og:image">` pointing to a Dynamo-branded image
- Add `<meta property="og:url">` and `<meta property="og:site_name" content="Dynamo">`
- Add `<meta name="twitter:title">`, `<meta name="twitter:description">`, `<meta name="twitter:image">`
- Add a theme-color meta

OG image: generate one matching brand (white bg, black "d.", "People to the Power" tagline, Instrument Serif). Save to `/public/og-image.png` (1200x630). I'll generate this in default mode using the same monochrome brand tokens.

**4. Task 9 — Empty Home state**
Need to inspect HomePage to see how empty For You / My Recent currently render. The carousels (`AutoCarousel`) likely render nothing or a blank when items are empty. Add an empty-state card inside each `<section>` when `items.length === 0`:
- For You empty → "No conversations yet today" + Explore button
- My Recent empty → "You haven't joined a debate yet" + Create + Explore buttons
- If BOTH empty (brand new user) → swap the two carousels for a single welcome card with two CTAs (Create / Explore) above the existing structure

Will use existing `Link` to `/create` and `/explore`, monochrome styling per brand memory.

## Plan summary

```text
┌─ Task 1: Auth ───────────────────────────────┐
│ configure_auth password_hibp_enabled = true  │
└──────────────────────────────────────────────┘

┌─ Task 2: live_sessions RLS ──────────────────┐
│ Migration: drop+recreate SELECT policy        │
│   USING (created_by = auth.uid()             │
│          OR is_public = true)                 │
│ Verify useHomeDebates trending already        │
│   filters is_public on live_sessions          │
└──────────────────────────────────────────────┘

┌─ Task 5: SEO ────────────────────────────────┐
│ Generate /public/og-image.png (1200x630)     │
│ Update index.html:                            │
│   + og:image, og:url, og:site_name           │
│   + twitter:title/desc/image                  │
│   + theme-color                               │
└──────────────────────────────────────────────┘

┌─ Task 9: Empty Home ─────────────────────────┐
│ HomePage.tsx: add empty-state cards           │
│  For You empty → CTA Explore                  │
│  My Recent empty → CTA Create + Explore       │
│  Both empty (new user) → welcome card top     │
└──────────────────────────────────────────────┘
```

## Files touched
- `supabase/migrations/<new>.sql` — drop+recreate live_sessions SELECT policy
- Auth config — HIBP toggle (no file)
- `public/og-image.png` — new generated artifact
- `index.html` — meta tags
- `src/pages/HomePage.tsx` — empty states
- `src/hooks/useHomeDebates.ts` — verify/patch trending live_sessions to require `is_public = true`

## Out of scope (explicitly not touching)
- Tasks 3, 4, 6, 7, 8 from the pre-launch list
- Any other RLS policies
- Any styling outside the empty Home state
