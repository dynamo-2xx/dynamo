---
name: Release §0 Waitlist Gate
description: Pre-launch public surface — single config flag, ID-card profiles, bubble grid, no Explore.
type: feature
---

# §0 — Waitlist Gate

Until the founder flips one config value, `joindynamo.lovable.app/` is the waitlist page and **nothing else public is reachable**.

## The flag
- `app_config.waitlist_mode` boolean (default `true`). Single source of truth. No deploy needed to flip — founder toggles in `/admin/config`.
- Read at the router level via `useWaitlistMode()` hook subscribed to a realtime channel so flipping is instant for everyone.

## Behavior when `waitlist_mode = true`
- `/` renders `<WaitlistPage>`. All other public routes (`/explore`, `/clubs`, `/topic/*`, `/u/*`, `/record/*`, `/notebook/*`) redirect to `/`.
- Authenticated routes (`/home`, `/study`, `/settings`, `/admin/*`) remain reachable for already-signed-up waitlist users — they're just early-access without the public Explore feed.
- Sign-in works (so existing waitlist users can return); new signup happens through the waitlist email field.

## Waitlist surface (allowed elements only)
- DYNAMO wordmark + one-line value prop.
- Email field — submitting it = signing up. Sends magic link via §16 `auth_magic_link`.
- Optional ID-card profile builder (US-government-ID layout) shown after email verification:
  - Required: username/name (collected with email).
  - Optional: profile picture, bio.
  - **ID number** field is reserved for SUPERCELL-ID / friend code (auto-generated, never user-entered).
- Bubble grid of all waitlisted users (profile pic + name). Virtualized; 50/page; infinite scroll.
- Clicking a bubble opens that user's full ID-card profile in a modal.
- From any open ID-card a CTA: "Create your own" → if not signed up, opens email field; if signed up, opens own profile editor.

## What is NOT on the waitlist surface
- No Explore feed, no debate cards, no live sessions, no records, no clubs, no Argument Map, no DYNAMO chat.
- No pricing page, no Pro upsell.
- No social proof claims about user count beyond the visible bubble grid (which IS the proof).

## Behavior when `waitlist_mode = false` (launch)
- `/` renders the public Home page.
- Waitlist bubbles surface remains accessible at `/early` as a permanent memento (read-only).
- All previously-waitlisted users keep their ID-card profile data (it's the same `profiles` row).

## Data model
- No separate "waitlist" table. A waitlist signup = a `profiles` row with `waitlist_joined_at` timestamp set.
- Bubble grid query: `select user_id, display_name, avatar_url from profiles where waitlist_joined_at is not null order by waitlist_joined_at desc`.
- RLS: SELECT on those columns allowed for `anon` only while `waitlist_mode = true` (policy reads the flag via SECURITY DEFINER helper `is_waitlist_mode()`).

## SEO
- Title <60 chars, meta desc <160 chars (matches site-wide SEO rules).
- OG image: DYNAMO wordmark on white. Static; no per-bubble OG cards.
- robots.txt allows `/` only; disallows everything else while flag is on.
- JSON-LD: `Organization` schema with name + url.

## Acceptance checklist
- `app_config.waitlist_mode` toggle flips the entire app between waitlist and full-launch state without redeploy, within 5s for all live clients.
- All non-allowed public routes 302 to `/` while flag is on.
- Email submission → magic link → ID-card builder → bubble appears in grid, all in one session, zero console errors.
- Bubble grid virtualizes past 1000 entries without jank on a 4-year-old iPhone.
- Anon users cannot reach any debate/live/record/notebook data via direct URL or API while flag is on (RLS-enforced, security-scan clean).
- Flipping the flag does not log anyone out and does not require any user to re-onboard.