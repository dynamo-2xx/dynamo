## Goal
Three connected changes on the Clubs surface:
1. **Club tagging**: admins tag their club (max 5) and mark one **primary** tag. Tags show on the About tab and power Explore-style tag shelves on `/clubs`.
2. **Private-club gating on `/club/:id`**: non-member viewers see the hero + tabs but the Upcoming/Past lists are replaced by a **fuzzy preview with a "Request to Join" overlay**.
3. **Fix "Couldn't create club" RLS error** on `/clubs/new` (both private and public flows).

---

## Part 1 — Tagging

### Database (single migration)
- `club_tags` already exists (PK `club_id + tag_id`, max-5 enforced in RLS).
- Add `primary_tag_id uuid` column to `public.clubs` (nullable).
- Add trigger that nulls `clubs.primary_tag_id` if the row in `club_tags` is removed; and validates that `primary_tag_id` always points to a tag also present in `club_tags` for the same club.
- Add index `club_tags(tag_id)` for shelf lookups.

### Hooks
- Extend `useTags.ts` so `kind` accepts `"club"` → table `club_tags`, fk `club_id`. Add `setPrimaryTag(clubId, tagId | null)`.
- Extend `useClubs.ts`: expose `primary_tag_id` on `ClubItem`; add `useClubTagShelves()` returning `{ tag, items: ClubItem[] }[]` grouped by `primary_tag_id`, sorted by `is_official` then size.

### TagPicker
- Add `kind="club"` support. Each selected chip gets a small **star** to toggle primary (single-select). Primary chip is filled + has a "Primary" label.
- Buffered mode (used before the club exists) keeps `primaryTagId` locally; persisted after club insert.

### Pages
- **`CreateClubPage`** — new "Topics" section using buffered TagPicker + primary marker. After insert: attach tags then `setPrimaryTag(club.id, primaryTagId ?? tags[0]?.id)`.
- **`ClubEditPage`** — Topics section bound to live `recordId={club.id}`.
- **`ClubPage` About tab** — render chips above the description; primary chip filled, others outlined; each chip links `/clubs?tag={slug}`.
- **`ClubsPage`** — Explore-pattern shelves: keep `FloatingSearch` + Featured + Near you + My Clubs, then insert **tag shelves** (one per tag from `useClubTagShelves()`, with `#tagName · count` and "See all →" → `/clubs?tag=slug`), then a final **More clubs** shelf for clubs with no primary tag. Support `?tag=slug` query param → render only that tag's clubs in a responsive grid (Explore "Results for…" pattern).

---

## Part 2 — Private club gating on `/club/:id`

When the viewer is **not** a member (and not admin) AND the club is **private** OR `requires_approval`:
- Keep: hero card, CTA row (showing "Request to Join" / "Request pending"), and the three tabs (Events / Members / About).
- Replace tab content with a **fuzzy preview**:
  - Render the existing Upcoming/Past/members layouts using **placeholder skeleton cards** (3 fake rows), wrapped in a div with `blur-md select-none pointer-events-none opacity-70`.
  - Layer an absolute overlay: lock icon + "Members only — request to join to see events and records." + a primary "Request to Join" / "Request pending" button (reuses existing `join` handler).
- About tab: still shows description + tags (public-safe).
- Public clubs and members: unchanged behavior.

Implementation lives entirely in `src/pages/ClubPage.tsx` via a new `PrivateGatedPreview` component rendered when `!isMember && (!club.is_public || club.requires_approval)`.

---

## Part 3 — Fix club creation RLS error

Error: `new row violates row-level security policy for table "clubs"`.

The only INSERT policy is `WITH CHECK (auth.uid() = created_by)`. The failure means either `auth.uid()` is null at insert time (stale session) or `created_by` doesn't match. Plan:
1. In `CreateClubPage.submit`, before insert, call `supabase.auth.getUser()` and use the returned `data.user.id` for `created_by` (covers cases where the context `user` is stale).
2. Gate the page behind `ProtectedRoute` if it isn't already; redirect to `/auth` when no user.
3. Toast a clearer message ("Please sign in again") on the RLS failure path.
4. Verify the fix by creating both a private and a public club from `/clubs/new`.

No schema change for Part 3 unless step 1–2 don't resolve it; if they don't, add a defensive `created_by` default of `auth.uid()` on the column. (Documented as fallback only.)

---

## Files touched
- new migration: `clubs.primary_tag_id` + sync trigger + `club_tags(tag_id)` index
- `src/hooks/useTags.ts`
- `src/hooks/useClubs.ts`
- `src/components/tags/TagPicker.tsx`
- `src/pages/CreateClubPage.tsx`
- `src/pages/ClubEditPage.tsx`
- `src/pages/ClubPage.tsx`
- `src/pages/ClubsPage.tsx`
