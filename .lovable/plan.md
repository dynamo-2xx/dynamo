

# Profile visibility overhaul

## Behavior summary

1. **All profile cards are viewable** by anyone (name, avatar, banner, affiliation). Content (debates, agenda, recent) is gated by `is_public`.
2. **New signups default to public** with a one-time onboarding screen explaining visibility, plus easy opt-out.
3. **Existing private accounts stay as-is** (no backfill).
4. **Private profiles appear in recommendations and search** as profile cards only — clicking lands on the locked profile shell.
5. **Follows on private profiles use a request/approval flow** — the private user must approve before the follow takes effect.

## Database changes (single migration)

**Defaults & trigger:**
- `ALTER TABLE profiles ALTER COLUMN is_public SET DEFAULT true;`
- Update `handle_new_user` to explicitly set `is_public = true` for clarity.

**New RPC `get_profile_card(_user_id uuid)`** — SECURITY DEFINER, returns name/avatar/banner/affiliation/role/is_public/created_at regardless of `is_public`. Granted to `anon` and `authenticated`. (Bypasses the existing RLS without weakening it; existing `get_public_profile` stays for callers that should only see public profiles.)

**New RPC `search_profile_cards(_q text, _limit int)`** — returns the same card subset for any profile (public or private) matching `_q` against `display_name`/`affiliation`. Used by user-search UIs.

**Update `get_recommended_users`** — drop the `is_public = true` filter on candidates; add `is_public` and `follow_status` (`none` | `pending` | `following`) to the returned columns. Recommendations now include private profiles.

**New table `follow_requests`:**

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `requester_id` | uuid | `auth.uid()` |
| `target_id` | uuid | the private profile being requested |
| `status` | text | `pending` \| `accepted` \| `declined` |
| `created_at` / `responded_at` | timestamptz | |

Unique `(requester_id, target_id)` while `status = 'pending'`.

RLS:
- Requester: `INSERT` if `auth.uid() = requester_id`. `SELECT`/`DELETE` own rows.
- Target: `SELECT`/`UPDATE` rows where `auth.uid() = target_id` (to accept/decline).

**New RPCs:**
- `request_follow(_target uuid)` — if target's profile is public, insert directly into `connections` (skip request flow). If private, insert a `follow_requests` row (idempotent on existing pending) and a `notifications` row to the target. Returns `{status: 'following' | 'requested'}`.
- `respond_follow_request(_request_id uuid, _accept bool)` — target-only. On accept, inserts the `connections` edge (SECURITY DEFINER bypasses the "public-only" INSERT policy) and marks request `accepted`. On decline, marks `declined`. Notifies requester either way.

**Connections RLS** stays as-is — direct INSERT remains public-only; private follows only happen via `respond_follow_request` SECURITY DEFINER path.

Realtime: add `follow_requests` to `supabase_realtime` so request inboxes update live.

## Frontend changes

**`src/pages/PublicProfilePage.tsx`** — switch fetch to `get_profile_card`. Always render the header. If `profile.is_public === false`:
- Replace public-debates section with a small "This profile is private. Their activity is hidden." notice.
- Follow button still active, but on private profiles it calls `request_follow` and shows `Requested` (pending) or `Following` based on returned status.

**`src/pages/OnboardingPage.tsx`** — add a one-time visibility step ("Let people discover you") with a toggle defaulting to public and a short note that it can be changed anytime in profile settings. Writes to `profiles.is_public`.

**Recommendations & search UIs** — `useRecommendedUsers` and any user-search hook now render private profiles too. Each card uses `follow_status` to render `Follow` / `Requested` / `Following`. Clicking a card navigates to `/u/<id>` (which handles the locked-shell case).

**New `src/pages/FollowRequestsPage.tsx`** (linked from the existing Inbox / `/notifications` area) — lists incoming pending requests with Accept / Decline buttons calling `respond_follow_request`. Optional small bubble in the existing notifications icon.

**`src/hooks/useConnections.ts`** — replace direct `connections` insert in `follow()` with `request_follow` RPC; expose new `pending` / `requested` state. Add `useIncomingFollowRequests` hook.

**`src/pages/EditProfilePage.tsx`** — clarify the existing visibility toggle copy: "Public profile — show your activity in search and recommendations. Your profile card is always visible."

## Files touched

- **New migration**: defaults + trigger update, `get_profile_card`, `search_profile_cards`, updated `get_recommended_users`, `follow_requests` table + RLS + realtime, `request_follow`, `respond_follow_request`.
- `src/pages/PublicProfilePage.tsx` — locked shell rendering.
- `src/pages/OnboardingPage.tsx` — visibility step.
- `src/pages/EditProfilePage.tsx` — toggle copy.
- `src/pages/FollowRequestsPage.tsx` — **new**.
- `src/hooks/useConnections.ts` — request flow + status.
- `src/components/home/FriendsOnlineWidget.tsx` and any recs/search consumer — render private cards + new follow states.
- `src/integrations/supabase/types.ts` — auto-regenerated.

## Out of scope

- Backfilling existing private accounts to public.
- DM permission changes for private users (current rules retained).
- Blocking/muting users.
- Showing private users' content to approved followers (still hidden — the approved flag only enables the connection edge; viewing rules on debates/sessions are unchanged).
- Email notifications for follow requests (in-app notification + DM thread mirror only).

