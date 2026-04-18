

## Goal
Add an **Edit Profile** experience accessible from the Profile page, built responsive-first from the largest layout shells down to the smallest controls, with explicit verification at each breakpoint.

## Scope of editable fields
Based on `profiles` schema already in use on the Profile page:
- `display_name`
- `affiliation`
- `role` (personal / education / community)
- `is_public` (visibility toggle)
- `location`
- `banner_url` (already in schema for home header)
- `avatar_url` (if present; otherwise add to migration)

No new tables. One small migration only if `avatar_url` doesn't exist yet — confirmed during Phase 0.

---

## Phased plan (largest → smallest)

### Phase 0 — Audit & schema check (no UI yet)
- Read `src/integrations/supabase/types.ts` to confirm which `profiles` columns already exist (`avatar_url`, `banner_url`, etc.).
- Read `AuthContext` to confirm how `profile` is loaded/refreshed after an update.
- Decide: add `avatar_url text null` migration only if missing.
- Deliverable: confirmed field list + refresh mechanism.

### Phase 1 — Page shell & route (largest container)
- New route `/profile/edit` (protected), registered in `src/App.tsx`.
- New `src/pages/EditProfilePage.tsx` wrapped in `AppLayout` so it inherits the existing sidebar/bottom-nav responsive shell (already handles md+ sidebar vs mobile bottom nav).
- Page container: `max-w-2xl mx-auto px-4 py-8 md:py-12` to match `ProfilePage` exactly — guarantees parity at every breakpoint we already support.
- Add an **Edit** button on `ProfilePage` (top-right of the avatar card) linking to `/profile/edit`.
- **Test**: navigate at 320, 375, 414, 768, 1024, 1366, 1920. Confirm no horizontal scroll, sidebar/bottom-nav switch at md (768), content stays centered.

### Phase 2 — Section layout (large blocks inside the shell)
Three stacked sections, each a bordered card matching the ProfilePage style:
1. **Banner + Avatar** (visual identity)
2. **Basic info** (display name, affiliation, location)
3. **Account settings** (role, visibility)
Plus a sticky-on-mobile / inline-on-desktop **Save / Cancel** action bar.

- Sections stack vertically at all sizes (single column) — keeps layout trivially responsive and matches the read-only ProfilePage.
- Save bar: `sticky bottom-0` on mobile (above the bottom nav, so `bottom-16`), `static` from `md:` upward.
- **Test**: at 320/375 confirm sticky bar doesn't overlap bottom nav; at 768+ confirm it sits inline at the end of the form.

### Phase 3 — Banner + Avatar block (medium components)
- Banner: full-width `aspect-[3/1]` image area with upload overlay button. Falls back to a gradient (reuse `src/lib/gradient.ts` deterministic util seeded by `display_name`).
- Avatar: 96px circle, overlapping the banner bottom by 50% (`-mt-12 ml-4`). Upload button as a small floating camera icon on the avatar.
- Upload flow: file picker → upload to Supabase Storage bucket `avatars` (and `banners`) → write returned public URL into local form state. Buckets created in the migration if missing, with public read + authenticated write RLS.
- **Test**:
  - Mobile (≤414): banner aspect stays 3/1, avatar doesn't clip card edges, upload buttons remain tappable (≥40px hit target).
  - Tablet (768): same proportions, avatar overlap still visually balanced.
  - Desktop (≥1024): banner caps at the `max-w-2xl` container width, no stretching artifacts.

### Phase 4 — Form fields (small components)
- Use existing `@/components/ui/{input,label,textarea,switch,radio-group}` for full token consistency.
- `display_name` — Input.
- `affiliation` — Input.
- `location` — Input with a small "Use my current location" ghost button (reuses geolocation pattern from `LocationPrompt`).
- `role` — RadioGroup (3 options) laid out as `grid-cols-1 sm:grid-cols-3` so they stack on mobile and sit side-by-side from `sm` (640px) up.
- `is_public` — Switch with label + helper text.
- All inputs `w-full`; labels above inputs; 16px gap between fields.
- **Test**:
  - 320px: every label fully visible, no input overflow, role radios stacked.
  - 640px+: role radios in a 3-up row.
  - Touch targets ≥40px on mobile.

### Phase 5 — Save / Cancel + state handling (smallest interactions)
- Local form state seeded from `profile`. `isDirty` derived by shallow compare.
- Save: `supabase.from('profiles').update(...).eq('id', user.id)` → on success refresh `AuthContext` profile (call its existing refresh, or refetch) → toast → navigate back to `/profile`.
- Cancel: if dirty, show `AlertDialog` confirm; else navigate back.
- Disable Save while pristine or while saving; show spinner inside the button.
- **Test**: dirty/clean states, error toast on failed update, that the new values show up immediately on `/profile` and in the home header (`GreetingHeader`).

### Phase 6 — Cross-breakpoint QA pass
- Walk through 320 / 375 / 414 / 640 / 768 / 1024 / 1366 / 1920 with the user, on both light and dark themes.
- Verify keyboard nav order, focus rings (already token-driven), and that the sticky save bar never traps content.

---

## Files
- **NEW** `src/pages/EditProfilePage.tsx`
- **EDIT** `src/pages/ProfilePage.tsx` — add Edit button linking to `/profile/edit`
- **EDIT** `src/App.tsx` — register `/profile/edit` (protected)
- **EDIT** `src/contexts/AuthContext.tsx` — only if no profile-refresh helper exists yet (expose `refreshProfile`)
- **MIGRATION** (conditional) — add `profiles.avatar_url text null` if missing; create `avatars` and `banners` storage buckets with public read + owner-write RLS

## Self-check
- [ ] Largest shell first (route + AppLayout container), smallest last (individual inputs)
- [ ] Each phase has explicit breakpoint test list
- [ ] No new tables; minimal schema delta
- [ ] Reuses existing UI primitives + gradient util for full token consistency
- [ ] Updated profile reflects on `/profile` and home header without page reload
- [ ] Sticky mobile save bar respects bottom nav height

