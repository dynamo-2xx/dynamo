---
name: Release §1 Auth & Onboarding
description: Email + Google sign-in, verification, sub-90s onboarding, invitee preview rules.
type: feature
---

# §1 — Auth & Onboarding

Most of the rules already live in `auth/onboarding.md` and `auth/onboarding-v2.md`. This file is the **launch acceptance** version — what must be true before the waitlist flag flips.

## Sign-in methods
- **Email magic link** (no password by default; password optional in account settings post-onboard).
- **Google OAuth** via Supabase `configure_social_auth` with `providers: ["google"]`. Without this the first Google attempt 500s — verified in launch smoke.
- Both methods work identically on mobile Safari, mobile Chrome, desktop Safari, desktop Chrome, desktop Firefox.
- Apple Sign-In: deferred to post-launch (not blocking; iOS PWA still works with Google).

## Email verification
- Required before the user can: create a debate/live/cmm, send an invite, follow anyone, post a comment, publish a notebook.
- Unverified users CAN: edit their profile, browse Explore (post-launch), preview an invite they were sent.
- Verification link lands on `/auth/callback?next=<intended>` and resumes the interrupted flow.
- Resend-verification button rate-limited to 1/min, 5/hour (matches §15 rate limits).

## Onboarding flow (sub-90s target)
1. Display name + SUPERCELL-ID auto-generated (`auth/onboarding-v2`).
2. Avatar (optional — skip-able, defaults to gradient initials).
3. Bio one-liner (optional).
4. Topic interests: pick 3+ from a chip grid (used for §11 Explore ranking and weekly digest).
5. Notification permission prompt (push) — soft ask via §8 pattern, dismissable.
6. Location permission deferred to first account-bound action (`onboarding-v2` rule, not asked here).
7. Done → land on `/home` with first-run empty-state hints (§12 territory).

Total: 5 screens, all skip-able except display name. Median completion <90s on a fresh device measured via PostHog `onboarding_completed.duration_ms`.

## Invitee preview (logged-out)
- Anyone with an invite link can preview the debate/live/cmm room without auth: sees topic, sides, participants, scheduled time.
- Cannot: join the call, accept/decline, comment, see Argument Map content.
- "Accept invite" CTA opens the auth modal with `next=<invite-url>` so verification resumes the join flow.

## Account states
- `active` — normal use.
- `unverified` — restricted as above; banner on every page "Verify your email".
- `suspended_until` (§15) — branded screen, blocked sign-in until timestamp.
- `banned_at` (§15) — branded screen, permanent unless appeal overturns.
- `pending_deletion` (§9) — 30-day grace; sign-in shows "Cancel deletion" + countdown.

## Session management
- Strict rule (in Core memory): exclusively `onAuthStateChange`, never `getSession`. Prevents the lock-contention bug we hit twice.
- Refresh tokens rotate (Supabase default). httpOnly cookies (Supabase default).
- "Sign out everywhere" button in `/settings/security` calls `supabase.auth.signOut({ scope: 'global' })`.

## Acceptance checklist
- Email magic link delivers within 30s on Gmail / Apple Mail / Outlook (covered by §16 deliverability).
- Google sign-in completes round-trip on mobile + desktop, no 500.
- New account → onboarded → on `/home` in <90s median across 10 manual test runs.
- Unverified user blocked from gated actions with friendly inline messaging (not a hard error).
- Invite link preview renders for logged-out user; Accept resumes after auth.
- Suspended/banned/pending-deletion screens render correctly per state.
- Zero `getSession` calls in the codebase (`rg "getSession" src/` returns only comments).