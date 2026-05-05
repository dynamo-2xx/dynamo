# Clubs + Events — v1 Plan

A new top-level **Clubs** hub for organizing groups of users around recurring debate / live / CMM activity. Members coordinate via **Events**: scheduled calendar entries with RSVP and venue, which the host launches into the underlying debate/live/CMM session at start time.

## Decisions locked in
- **Membership**: public clubs = one-click join; private clubs = request → admin approves/denies.
- **Event creation**: any member of a club can publish an Event.
- **Events**: dedicated entity (calendar metadata + RSVP + venue) that, when started, spawns/links a debate, live, or CMM session.
- **Discovery**: surfaced only in the new Clubs tab (not on Explore in v1).

---

## 1. Navigation

`AppLayout.tsx` — add a **Clubs** item between Home and Explore.
- Desktop sidebar: below Home.
- Mobile bottom nav: beside Home (5 items now: Home, Clubs, Explore, Profile, Messages).
- Icon: `Users` from lucide-react. Route: `/clubs`.

## 2. Pages & routes

```
/clubs                         Clubs hub (Explore-style discovery)
/clubs/new                     Create Club (Club Generator)
/clubs/:id                     Club page (about, members, events, feed)
/clubs/:id/edit                Admin settings (admins only)
/clubs/:id/events/new          Create Event (any member)
/clubs/:id/events/:eventId     Event detail (RSVP, launch session)
```

All protected except `/clubs` and public club pages (which render gated content for non-members).

## 3. Clubs hub (`/clubs`) — mirrors Explore

Same structure as `ExplorePage.tsx`:
- Header row with title "Clubs" + search input.
- Sticky chip bar: **All · My Clubs · Public · Recently Active · Near Me** + tag chips (reusing `useAllTags` filtered to a `club_tags` join later — v1 just builtin chips).
- Grid of `ClubCoverCard` (mirrors `DebateCoverCard`): cover image, club name, 1-line description, member count, public/private badge.
- Floating/top-right **Create Club** button (visible to authenticated users).

## 4. Club page (`/clubs/:id`)

Layout: hero (cover + name + about + join/request CTA + member count) → tab strip:
- **Events** (default) — Upcoming list + Past list. RSVP toggle on each card. "+ New Event" button for members.
- **Members** — grid with role badges (Owner / Admin / Member). Admins see "Pending requests" section.
- **About** — long description, tags, location, links.
- **Discussion** — simple feed (reuse `record_comments` pattern, scoped by `record_type='club'`).

Non-members on a private club see only hero + About + Request to Join button.

## 5. Create Club (`/clubs/new`)

Modeled on `CreateDebatePage.tsx` flow:
- Name, description, cover image (reuse `CoverImageUploader`).
- Visibility: Public / Private toggle.
- Location (optional).
- Tags (reuse `TagPicker`).
- Submit → creates club, sets creator as Owner, redirects to `/clubs/:id`.

## 6. Create Event (`/clubs/:id/events/new`)

Modeled on debate creation but lighter:
- Title, description.
- Type: **Debate · Live · CMM** (drives which generator the host launches at start).
- Date/time, duration estimate.
- Mode: In-person (venue text + optional map link) / Online / Hybrid.
- Capacity (optional).
- Optional: pre-fill underlying session (e.g. for Debate type, can pre-select topic + sides; can also defer until launch).

When the host clicks **Launch** on the event detail page at/after start time:
- Creates the underlying debate/live/CMM via existing creation flows.
- Stores the resulting `session_id` + `session_type` on the event row.
- All RSVP'd attendees see a "Join now" button.

## 7. Membership flow

- **Public club** + Join button → insert `club_members` row with role `member`, status `active`.
- **Private club** + Request to Join → insert `club_join_requests` row, status `pending`. Notifies all admins via `notifications`.
- Admin approves → request row deleted + `club_members` row inserted. Denies → request marked `denied`.
- Leave Club → delete own `club_members` row (Owner cannot leave without transferring; v1 disables Leave for owner).

## 8. Notifications

New notification types reusing the `notifications` table:
- `club_join_request` (to admins)
- `club_join_approved` / `club_join_denied` (to requester)
- `club_event_published` (to all members of the club)
- `club_event_starting_soon` (15 min before, to RSVP'd users) — handled by a scheduled edge function later; v1 ships in-app only.

---

## Technical section

### New tables

```sql
clubs (
  id uuid pk,
  created_by uuid not null,
  name text not null,
  description text,
  cover_image_url text,
  is_public boolean not null default true,
  location text,
  created_at, updated_at
)

club_members (
  id uuid pk,
  club_id uuid not null,
  user_id uuid not null,
  role text not null default 'member',  -- 'owner' | 'admin' | 'member'
  joined_at timestamptz not null default now(),
  unique (club_id, user_id)
)

club_join_requests (
  id uuid pk,
  club_id uuid not null,
  user_id uuid not null,
  status text not null default 'pending',  -- 'pending' | 'denied'
  message text,
  created_at, responded_at,
  unique (club_id, user_id)
)

club_tags (club_id uuid, tag_id uuid, primary key(club_id, tag_id))

club_events (
  id uuid pk,
  club_id uuid not null,
  created_by uuid not null,
  title text not null,
  description text,
  event_type text not null,          -- 'debate' | 'live' | 'cmm'
  starts_at timestamptz not null,
  ends_at timestamptz,
  mode text not null default 'online',  -- 'online' | 'in_person' | 'hybrid'
  venue text,
  capacity int,
  status text not null default 'scheduled',  -- 'scheduled' | 'live' | 'completed' | 'cancelled'
  session_id uuid,                   -- filled in when launched (debate/live/cmm id)
  created_at, updated_at
)

club_event_rsvps (
  event_id uuid, user_id uuid,
  status text default 'going',       -- 'going' | 'maybe' | 'declined'
  created_at,
  primary key (event_id, user_id)
)
```

### RLS helpers (SECURITY DEFINER, mirroring `can_view_debate`)

```sql
public.is_club_member(_club_id uuid)  -- true if auth.uid() is in club_members
public.is_club_admin(_club_id uuid)   -- true if role in ('owner','admin')
public.can_view_club(_club_id uuid)   -- public OR member
public.can_view_event(_event_id uuid) -- via parent club's can_view_club
```

### RLS policies (highlights)
- `clubs` SELECT: `is_public OR is_club_member(id)`.
- `clubs` UPDATE: `is_club_admin(id)`. DELETE: owner only.
- `club_members` SELECT: `can_view_club(club_id)`. INSERT for self only on **public** clubs (`is_public AND user_id = auth.uid()`); private joins go through approval flow only. DELETE: self OR admin (and never the owner).
- `club_join_requests` SELECT: requester OR club admins. INSERT: self on private clubs. UPDATE: admins. DELETE: requester.
- `club_events` SELECT: `can_view_club(club_id)`. INSERT: `is_club_member(club_id)` (any member). UPDATE/DELETE: creator OR admin.
- `club_event_rsvps` SELECT: `can_view_event(event_id)`. INSERT/DELETE: self only AND `is_club_member`.
- `club_tags` mirrors `debate_tags`.

### New code

**Pages**: `ClubsPage`, `CreateClubPage`, `ClubPage`, `ClubEditPage`, `CreateClubEventPage`, `ClubEventDetailPage` (under `src/pages/`).
**Components** (`src/components/clubs/`): `ClubCoverCard`, `ClubHero`, `ClubMembersList`, `JoinRequestRow`, `ClubEventCard`, `EventRSVPButton`, `LaunchEventButton`.
**Hooks** (`src/hooks/`): `useClubs`, `useClub`, `useClubMembership`, `useClubEvents`, `useEventRSVP`, `useClubJoinRequests`.
**Routes**: register all six in `src/App.tsx` (protected except public read).
**Nav**: add Clubs item in `AppLayout.tsx`.

### Reuse
- `DebateCoverCard` patterns for `ClubCoverCard`.
- `CoverImageUploader`, `TagPicker`, `Collapsible`, existing chip styling from `ExplorePage`.
- `notifications` table — no schema change needed for new types.
- Existing debate/live/CMM creation entry points get called by `LaunchEventButton`.

### Out of scope for v1 (follow-ups)
- Recurring events.
- Club discussion threads / posts (just RSS-style feed v1).
- Event Generator AI suggestions.
- Calendar sync (Google Calendar) — possible later; connector exists.
- Clubs surfaced on Explore/Profile/Home.
- Scheduled push for "starting soon".
- Owner transfer UI.
