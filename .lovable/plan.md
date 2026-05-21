## Goal

Replace the current full-width `FeaturedHero` at the top of `/explore` with a horizontal row of **mid-size hero cards** (3 visible on desktop), with a right-side arrow control and a **For You / Local** toggle above the row. The row surfaces records ranked by recent activity (comments + participants), filtered globally or by the viewer's city. Defaults to **Local** when location is available.

## Visual layout

```text
┌─ Explore ──────────────────────────────────────────────────────┐
│ Featured                            [ For You │ Local ]     →  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│ │  hero 1  │ │  hero 2  │ │  hero 3  │  (peek of 4th)          │
│ └──────────┘ └──────────┘ └──────────┘                         │
│ #Politics …                                                    │
```

- Desktop: 3 cards visible. Tablet: 2. Mobile: 1.1 (peek).
- Each hero card: ~16:9 cover, gradient overlay, status badge top-left, large display-font title bottom-left, publisher + activity meta. Snap-scroll horizontally.
- Right-edge chevron button (matches `TagShelf` chevron style) advances by one card.
- Toggle pill sits at the right of the section header, same translucent treatment as the nav bubble (`bg-foreground/5`, `border-border/60`, `rounded-full`). Active side = filled chip.

## Behavior

- **For You (global)**: top N records by activity score across the site.
- **Local**: same ranking, restricted to records whose creator's `profiles.location` matches the viewer's `profiles.location` (case-insensitive, trimmed). If the viewer has no location, hide the Local toggle (or show disabled with tooltip "Add your city in profile") and force For You.
- **Default**: Local when both viewer location and ≥3 local records exist; otherwise For You.
- Toggle choice persists in `localStorage` (`explore.featuredScope`).

## Activity score

For each candidate record (debates + imported_records, public + non-archived):
- `comments` = `count(record_comments where record_id = r.id)`
- `participants` = `debate_participants` count (0 for imports)
- `recency_weight` = `exp(-age_days / 14)`
- `score = (comments * 3 + participants * 2) * recency_weight + (status='live' ? 5 : 0)`

Computed in a new SQL function `public.featured_records(p_scope text, p_viewer uuid, p_limit int)` returning the top N rows with all fields needed for the card (id, kind, topic/title, cover_image_url, status, created_at, created_by, participant_count, comment_count). Scope `'local'` joins viewer's profile location to creator's profile location.

## Files

**New**
- `src/components/explore/FeaturedRow.tsx` — section wrapper: header + toggle + horizontal snap row + right chevron.
- `src/components/explore/FeaturedCard.tsx` — mid-size hero card (between `FeaturedHero` and `CompactRecordCard` in scale).
- `src/hooks/useFeaturedRow.ts` — fetches via the new RPC, exposes `{ items, loading, scope, setScope, canUseLocal }`.

**Modified**
- `src/pages/ExplorePage.tsx` — replace `<FeaturedHero d={hero} />` with `<FeaturedRow />`. Remove `useFeaturedDebates` dependency for the hero slot.
- `src/components/explore/FeaturedHero.tsx` — keep file for now (unused) or delete in a follow-up.

**Database migration**
- Create `public.featured_records(p_scope text, p_viewer uuid, p_limit int)` SECURITY DEFINER function returning the merged ranked set. Uses existing RLS-safe joins; only reads public/non-archived rows.

## Open follow-ups (not in this plan)
- Caching: function recomputes per call; if perf becomes an issue, add a materialized view refreshed every 5 min.
- "Local" radius-based scope (vs. city-string match) — would require a geo column on profiles.

