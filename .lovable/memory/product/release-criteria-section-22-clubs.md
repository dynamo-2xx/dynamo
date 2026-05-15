---
name: Section 22 — Clubs at launch
description: Release criteria for Clubs v1 — creation, discovery, events, moderation, and role hierarchy
type: feature
---

# §22 — Clubs at launch

## Creation
- Any authenticated user (free tier) can create a Club. No tier gating at launch.
- Creator is automatically assigned **Owner** role.
- Owner has exclusive rights to **delete the club** and **transfer ownership**.

## Role hierarchy
Three roles, strict hierarchy:
1. **Owner** — single user; full control; only role that can delete club or transfer ownership.
2. **Administrator(s)** — promoted by Owner or other Admins; all moderation powers except delete/transfer.
3. **Member(s)** — standard participant; can RSVP and (per club setting) create events.

## Club settings (Owner/Admin dashboard)
Two key toggles surfaced in club settings page:
- **Visibility**: Private (invite-only, join-request flow) ↔ Public (auto-join, no approval needed). Default: Public.
- **Event creation policy**: "Members can create events freely" ↔ "Admin approval required before event publishes". Default: free.

## Discovery
- Single Clubs directory at `/clubs` with a top-level toggle: **Featured** ↔ **Local**.
  - **Featured** = editorial picks curated by Dynamo (manual flag on `clubs` table, e.g. `is_featured boolean`).
  - **Local** = clubs sorted by proximity to user's Civic location (uses existing location field).
- Toggle persists in URL (`?view=featured|local`) and localStorage.
- Below the toggle: full searchable directory of all public clubs (existing list view).
- Private clubs never appear in directory; reachable only via direct link or invite.

## Events at launch
Clubs can host all three formats **plus recurring/series support**:
- **Debate**, **Live**, **CMM** — full parity with main create flows.
- **Recurring events** — weekly/monthly recurrence rule on `club_events` (new field `recurrence_rule text` storing iCal RRULE-style string; expand to instances on read).
- **Launch from Club page**: The Club page must include "+ New Event" CTAs that open the same Debate/Live/CMM creation flows as the Home hero, **pre-filled with `club_id`**. Currently these flows are only reachable from Home — Clubs must surface them inline.
- If event creation policy = "admin approval required": new events save with `status='pending_approval'` and are hidden from the directory until an admin approves.

## Moderation tools (launch)
Owner + Admin powers:
- Approve / deny join requests (private clubs).
- Remove members (Admins cannot remove Owner or other Admins; Owner can remove anyone except self).
- Promote Member → Admin; demote Admin → Member (Owner only, OR Admin if Owner allows in future setting — launch: Owner-only).
- Transfer ownership (Owner only; on transfer, old Owner becomes Admin).
- Delete events (creator OR any admin).
- Pre-publish event approval (when toggle enabled).
- Edit club metadata (name, description, cover, location, visibility, event policy).
- Manage tags (existing).

Out of scope for v1: mute/ban with audit log, content reporting pipeline, co-admin governance workflows beyond promote/demote.

## Data model deltas
- `clubs`: add `is_featured boolean default false`, `events_require_approval boolean default false`.
- `club_events`: add `recurrence_rule text null`, extend `status` to include `'pending_approval'`.
- RLS: `club_events` SELECT must hide `pending_approval` from non-admin viewers.
- New helper `is_club_owner(club_id)` already exists; reuse for transfer/delete gates.

## UI surfaces
- `/clubs` — directory with Featured/Local toggle.
- `/clubs/:id` — Club page with inline "+ New Debate / Live / CMM" buttons (gated by event policy).
- `/clubs/:id/settings` — Owner/Admin dashboard (visibility toggle, event policy toggle, member management, pending event approvals tab).
- `/clubs/:id/events/new` — existing flow; extend to route to format-specific creation pages with `club_id` pre-bound.
