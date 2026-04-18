

## Goal
Three changes:
1. **MyRecentPage**: swap "Explore →" link for "My Agenda →".
2. **AutoCarousel**: change resume-after-interaction delay from 10s → 5s.
3. **DebateCoverCard** (home + carousel + expanded pages): for cards owned by the current user, replace the generic status pill with a **Public/Private** pill, and add an inline action menu (Switch Public/Private, Archive, Delete). Also add a "See more" CTA at the top of `MyRecentPage` and `ForYouPage`.

## Scope details

### 1. `src/pages/MyRecentPage.tsx`
- Replace the `<Link to="/explore">Explore →</Link>` with `<Link to="/my-debates">My Agenda →</Link>` (the route used by `MyDebatesPage`).

### 2. `src/components/home/AutoCarousel.tsx`
- Change default `resumeAfterMs` from `10000` → `5000`. (`intervalMs` already 5000 — no change.)

### 3. `DebateCoverCard` — owner controls + Public/Private pill
File: `src/components/home/DebateCoverCard.tsx`

- Extend `DebateCoverItem` interface with `created_by?: string` and `is_public?: boolean` (both optional so existing call sites that don't pass them keep working).
- Inside the card, get `user` from `useAuth()`. Compute `isOwner = user?.id === d.created_by`.
- **Status pill logic**:
  - If `isLive` → keep existing live pill.
  - Else if `isOwner` → render a **Public** or **Private** pill based on `d.is_public` (e.g. green dot for public, gray dot for private).
  - Else → keep existing `{d.status}` pill (Completed / Archived / etc.).
- **Action menu (owner only, non-live)**: small ⋯ button in the top-right corner inside the cover card, anchored next to the participant count. Opens a `DropdownMenu` (existing primitive) with three items:
  1. **Make Public / Make Private** — toggles `debates.is_public`.
  2. **Archive** — sets `status` to `'archived'` (enum value already exists).
  3. **Delete** — opens an `AlertDialog` confirm, then deletes the debate row (RLS already allows `created_by` to delete).
- The ⋯ button uses `e.preventDefault(); e.stopPropagation();` so clicking it doesn't follow the card's `<Link>` navigation. Same for menu items.
- After a successful mutation, call an optional `onChanged?: () => void` callback so parent lists can refresh. Hooks (`useMyRecentDebates`, `useForYouDebates`) get a small refetch trigger (bump a version state in the hook + expose `refresh`). For Delete/Archive we also locally remove the item from the parent's items state via callback for instant feedback.

### 4. Hook updates (`src/hooks/useHomeDebates.ts`)
- Select `is_public, created_by` in both `useForYouDebates` and `useMyRecentDebates` queries; pass them through into the `DebateCoverItem` mapping.
- Expose a `refresh()` function from each hook (just bumps an internal `version` state included in the `useEffect` deps).

### 5. "See more / all" CTA on expanded carousel pages
- `src/pages/MyRecentPage.tsx` and `src/pages/ForYouPage.tsx`:
  - Currently both already fetch up to 60 items in a single grid. Add a client-side **pagination chunk** — show 12 by default, and a `See all` button at the bottom (centered, ghost style) that reveals the rest. Once expanded, the button is replaced by `Showing N of N`.
  - This satisfies "include a select more/all button" without changing data fetching.
- Live sessions: this change is for **debates only** (which is what the carousels show today). Live session ownership controls live on `MyDebatesPage` and are out of scope per "change nothing else."

## Files to edit
- `src/pages/MyRecentPage.tsx` — link swap + "See all" pagination.
- `src/pages/ForYouPage.tsx` — "See all" pagination.
- `src/components/home/AutoCarousel.tsx` — default `resumeAfterMs` → 5000.
- `src/components/home/DebateCoverCard.tsx` — owner pill + ⋯ action menu (uses existing `dropdown-menu` and `alert-dialog` UI primitives).
- `src/hooks/useHomeDebates.ts` — select `is_public, created_by`; add `refresh()`.

No DB migration needed: `is_public` and the `archived` enum value already exist; RLS already permits update + delete by `created_by`.

## Self-check
- [x] Owner-only controls — gated by `user.id === d.created_by`, also enforced server-side by existing RLS.
- [x] Click-through to debate not broken — menu button stops event propagation.
- [x] Public/Private replaces status pill **only for owner** non-live cards; other viewers still see the original status.
- [x] Live status pill preserved (no toggle/menu shown while live to avoid mid-debate disruption).
- [x] "See all" applies to both expanded pages (`/my-recent`, `/for-you`).
- [x] Resume-after delay reduced to 5s as requested.
- [x] No other UI/UX changes.

## Clarifying questions

1. **Action menu placement & trigger style** — preferred look?
   - (A) Small ⋯ icon button in the top-right corner of the cover card (inline with the participant count chip), opens a dropdown menu.
   - (B) Long-press / right-click only (cleaner card, less discoverable).
   - (C) Hover-reveal ⋯ button on desktop, always-visible on mobile.

2. **Archive behavior** — when an owner archives a debate, where should it still appear?
   - (A) Hidden from "My Recent" carousel and `/my-recent`; still visible under My Agenda → Debates with an "Archived" pill.
   - (B) Stays in My Recent but greyed out with an "Archived" pill.
   - (C) Hidden everywhere except a new "Archived" tab on My Agenda.

3. **"See all" pagination size** — initial visible count on `/my-recent` and `/for-you`?
   - (A) Show 12 → expand to all (up to 60 already fetched).
   - (B) Show 24 → expand to all.
   - (C) Show 12 → "Show 12 more" stepped pagination.

4. **Delete confirmation copy** — Delete is permanent (RLS hard-deletes the row). Should the confirm dialog warn that this also removes the transcript and any participant grades, or keep it short ("Delete this debate? This can't be undone.")?

