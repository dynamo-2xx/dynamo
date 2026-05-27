## Goal

Add a fourth tab — **Explore** — to `/clubs/:id` alongside Events / Members / About. It mirrors the global Explore page but scoped to this club, with the same records ↔ feed toggle button.

## What shows up

**Records view** (default)

- All session records spawned from this club's events: pull `club_events.session_id` for this `club_id`, then resolve into debates / live sessions / CMMs (CMMs are stored in `debates` with `format='change_my_mind'`).
- Rendered with the existing `CompactRecordCard` / shelf components so it visually matches `/explore`.
- Sections: **Live now**, **Upcoming** (events with a scheduled session), **Completed**.

**Feed view** (toggle)

- **Notebooks**: `session_notebooks` where `published = true`, `deleted_at is null`, and `record_id` ∈ club session ids.
- **Takes**: `takes` where `is_public = true` and `club_id = this club`.
- Reuses `TakeCard` and `FeedNotebookCard`. Same infinite-scroll pattern as `useFeed`, but a club-scoped variant (no For You / Local tabs — single chronological stream).
- **Composer** is shown to members only and posts a Take with `club_id` pre-filled. Non-members see a "Join to post" hint instead.

## Visibility

- Public clubs: tab is visible to everyone (anon + auth), no gating. Matches `Records spawned from club events`/notebooks/takes which are already publicly readable when their parent record is public.
- Private clubs: tab is gated by the existing `GatedPreview` blurred panel, same as Events/Members.

## Files

**New**

- `src/hooks/useClubExplore.ts` — fetches club records (via `club_events.session_id` + record table lookups) and club-scoped notebooks + takes. Exposes `{ records, feedItems, loadMore, hasMore, loading }`.
- `src/components/clubs/ClubExploreTab.tsx` — owns the local `view: "records" | "feed"` state and renders either the records shelves or the feed list. Holds the toggle button inline (top-right of the tab content, not the floating global one — keeps it scoped to the tab).
- `src/components/clubs/ClubTakeComposer.tsx` — thin wrapper that calls `useTakes.create` with `club_id` injected; gated on `isMember`.

**Edited**

- `src/pages/ClubPage.tsx` — extend `Tab` union to `"events" | "explore" | "members" | "about"`, add tab button, render `<ClubExploreTab clubId={club.id} isMember={isMember} gated={gated} />`.

## Data model change

`public.takes` gains an optional `club_id uuid` column.

```sql
ALTER TABLE public.takes ADD COLUMN club_id uuid NULL;
CREATE INDEX takes_club_id_created_at_idx
  ON public.takes (club_id, created_at DESC)
  WHERE club_id IS NOT NULL;
```

RLS: existing public-read policy still applies. Insert policy stays `author_id = auth.uid()`; we add a guard so a take can only carry `club_id` if the author is a member of that club:

```text
CHECK (club_id IS NULL OR public.is_club_member(club_id))
```

implemented as an additional RLS WITH CHECK on INSERT/UPDATE.

No change to `session_notebooks` — they're already joined via their `record_id`.

## Out of scope

- Editing the records/feed toggle button to be the same floating button as `/explore` (we keep it inline in the tab to avoid colliding with the club page chrome). also add the search bar button. 
- Per-tag filtering inside the club Explore. Add this. Admins have tag console.
- Pinning / featured curation by club admins (could come later). Add this feature through the row where the + New Event is. it opens up a search bar and index of records/feed. 

```text
ClubPage
└── Tabs: Events | Explore | Members | About
        └── ClubExploreTab
            ├── [Records ⇄ Feed] toggle (inline top-right)
            ├── Records: shelves of club-event records
            └── Feed:
                ├── ClubTakeComposer (members only)
                └── infinite list of takes + notebooks
```