

## Goals
1. **Fix the ⋯ owner menu** so it actually opens, opens reliably on touch, and looks crisp in both light and dark mode.
2. **Add bulk-select mode** to the expanded carousel pages (`/my-recent`, `/for-you`) so the user can pick multiple cards and apply Make Public/Private, Archive, or Delete in one go.
3. **Rename "Drafts" → "Archive"** on `MyDebatesPage` and surface both drafts *and* archived debates there, with an `Archived` badge on archived items. Single-card Archive on cover cards instantly removes the card from the current view and routes that debate into the new Archive tab.

## Why the menu currently fails
The trigger `<button>` and the menu items use `onPointerDown`/`onClick` handlers that call `preventDefault()`. Radix's `DropdownMenuTrigger` opens via `pointerdown`, so calling `preventDefault()` on `pointerdown` cancels Radix's open behavior. Combined with the dropdown sitting inside a `relative group` next to a full-area `<Link>`, some clicks fall through to the link too. The fix:
- Stop using `onPointerDown` on the trigger; only `stopPropagation` (no `preventDefault`) so Radix can open.
- Wrap the absolute-positioned trigger in a tiny pointer-events container that intercepts pointer events before they reach the underlying `<Link>`.
- Use `e.stopPropagation()` on `onClick` only.

## Visual fixes (light + dark, neutral monochrome — your selection)
Pills and the ⋯ button become token-driven:
- ⋯ button: `bg-background/95 text-foreground border border-border shadow-sm hover:bg-background` (visible on any cover; same in both themes).
- Public pill: `bg-background/95 text-foreground border border-border` + `Globe` icon.
- Private pill: `bg-background/90 text-muted-foreground border border-border` + `Lock` icon.
- Archived pill (new, used inside Archive tab and any archived card seen elsewhere): `bg-background/95 text-foreground border border-dashed border-border`.
- Status pill for non-owners: same neutral chip as today but with `border border-border` for dark-mode visibility.

## Bulk select mode
A small **Select** toggle near the page heading on `/my-recent` and `/for-you` (next to the existing "See all" footer). When active:
- Each `DebateCoverCard` gets a checkbox in the top-left (replacing the status pill while in select mode), and clicking the card body toggles selection instead of navigating.
- A floating bottom action bar appears with **Make Public**, **Make Private**, **Archive**, **Delete** (and **Cancel**). Bar is `fixed bottom-4` on mobile (above the bottom nav: `bottom-20`), inline at `md:` and up.
- Bulk actions run as a single Supabase `update`/`delete` `in('id', selectedIds)` call. RLS already restricts to rows owned by `auth.uid()`. Non-owned cards in selection are filtered out client-side before the call.
- After success: items removed from list (Archive/Delete) or `is_public` patched in place (privacy toggle), selection cleared, mode exited.

`DebateCoverCard` accepts new optional props: `selectionMode?: boolean`, `selected?: boolean`, `onToggleSelected?: (id) => void`. When `selectionMode` is on, the `<Link>` becomes a `<div>` and the action menu is hidden.

## Archive tab on My Agenda
- Rename the "Drafts" tab to **Archive**. Underlying URL param: `?tab=archive` (back-compat: `?tab=drafts` still loads it).
- Query for that tab: `status in ('draft','archived')`.
- Each row in Archive shows a pill: "Draft" or "Archived".
- When the user archives a debate from a cover card, it moves into this tab automatically (it's just a status change). The toast becomes "Archived — find it in My Agenda → Archive".

## Files to edit
- `src/components/home/DebateCoverCard.tsx`
  - Fix the trigger event handlers (drop `onPointerDown`, only `stopPropagation`).
  - Replace pill/menu colors with token-driven neutral monochrome.
  - Add selection-mode rendering (checkbox, no navigation, hides menu).
- `src/pages/MyRecentPage.tsx`
  - Add `Select` toggle and bulk-action bar; track `selectedIds` set.
  - Wire bulk Public/Private/Archive/Delete via Supabase + local list updates.
- `src/pages/ForYouPage.tsx`
  - Same Select + bulk-action bar (only acts on cards owned by the user; non-owned are silently skipped, with toast count).
- `src/pages/MyDebatesPage.tsx`
  - Rename tab label "Drafts" → "Archive".
  - Tab query loads both `draft` and `archived` debates.
  - Per-row badge: Draft vs Archived.
  - Accept `?tab=archive` (and keep `?tab=drafts` working).

No DB migration needed — `archived` and `draft` already exist in the `debate_status` enum and RLS already covers update/delete by `created_by`.

## Self-check
- [x] Owner menu opens on light + dark, mobile + desktop (`pointerdown` no longer blocked).
- [x] Pills + ⋯ button use semantic tokens → visible in both themes on any cover image.
- [x] Bulk select on both expanded pages with Public/Private/Archive/Delete; respects RLS.
- [x] Archived debates land in renamed Archive tab with their own badge.
- [x] No other UI changes; carousel timing and existing "See all" footer untouched.

