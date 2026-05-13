---
name: Release Criteria
description: Definition of "public-ready" for Dynamo. Checked before any release-prep work is called done.
type: feature
---

# Public Release Criteria

## 0. Waitlist gate
- Waitlist page replaces the current home page as the public landing until launch.
- Hard wall: visitors cannot browse Explore or public profiles.
- Allowed on the waitlist surface:
  - Email field (entering email = signing up to the waitlist).
  - Optional ID-card profile (US-government-ID layout). Optional fields: profile picture, bio.
    Required fields: username/name (collected with email). ID number is reserved for friend-adding.
  - A grid of waitlisted users' profile-picture bubbles + names.
  - Clicking a bubble opens that user's full ID-card profile.
  - From a profile view, the visitor is prompted to create their own (which forces email signup if not done).
- Launch flag is a single config value the founder can flip without a deploy.

## 1. Auth & onboarding
- Email + Google sign-in work on mobile + desktop.
- Email verification required.
- Onboarding completes in under 90 seconds.
- Logged-out invitees may preview a debate room but must auth before joining.

## 2. Core happy path — end-to-end, zero console errors
Canonical flow for Debate, CMM, and Live:

  Generate session in template
    -> Owner sends invites from the Invitations tab inside the template (pre-publication).
    -> Invitee receives a notification, can Accept or Decline.
       - Decline: their bubble in the Invitations tab pulses red.
       - Accept: their bubble pulses green, they pick a side/seat, then press Confirm
                 (the extra click is intentional to prevent misclicks).
       - The owner can drag an accepted bubble between sides/seats.
    -> Accepted invitees are locked to the draft and auto-routed to Mic-Prep on publish.
  -> Mic-Prep (replaces the current Mic Lobby — see section 2a)
  -> Session runs (format-specific rules; argument map + AI analysis live).
  -> Session ends; users transition to the Record.
  -> Record contains transcript, threaded view, and the argument map compiled from the session.
  -> Owner toggles public/private on the record.
  -> Users see their own performance grading only when grading is enabled in session config.

Each format must complete this loop with zero console errors and produce its archive artifact.

## 2a. Mic-Prep (replaces Mic Lobby)
- Replaces today's owner-only Mic Lobby. Same screen for owner and invitees, with one delta.
- Personal-device layout (phone/laptop):
  - Primary view: the user's OWN mic test (level meter, unmute button).
  - Other participants are shown as small profile-picture bubbles in a collapsible list.
  - Bubble border rotates like a loading icon while not ready.
  - When the user's mic test passes viability, their border becomes solid + checkmark = "readied up".
  - Owner-only: Force-start button beneath the bubbles + mic-test area.
- Projected/large-screen layout (room projector):
  - No single user's mic is primary; all profile bubbles are shown equally with the same border-state rules.
- When every bubble is solid + checked, the room auto-transitions to the session.

## 3. My Study — co-equal pillar
- Every Debate, CMM, Live session, and any Record can spawn a notebook from the notebook icon.
- Notebooks live on the owning user's private My Study.
- Notebooks have tabs and support publishing:
  - publish a single Take to the profile, OR
  - publish the full notebook (which then itself becomes a Record).
- Other users may leave comments / reader notes on a published notebook.
- Other users may create their own notebooks ABOUT a published notebook (notebook-on-notebook).
- Only the owner can edit a notebook.
- Profiles display published notebooks as hero cards, identical pattern to debate/live/CMM cards.

## 4. In-person reliability
- Per-format mic policy enforced (debate = turn lock, CMM = host + active, live = open + echo guard).
- Voice-detection-only fallback works when a joiner has no device.
- Mic-Prep readiness state is the gate to leave the prep screen.

## 5. Data safety (RLS)
- No table is publicly readable except by intent (waitlist bubbles, Explore feed post-launch, public profiles, published notebooks).
- All debate-scoped tables go through can_view_debate.
- Notebook visibility respects published/private flag.
- Security scan returns zero high/critical findings.

## 6. Performance budgets (1000+ users)
- Home, Explore, Debate Room first paint under 2.5s on 4G.
- No query returns more than 1000 rows without pagination.
- Realtime channels stay under 10 active subscriptions per session.

## 7. Mobile + PWA
- Installable as PWA, service worker registers, push notifications deliver.
- All primary flows usable one-handed on a 375px-wide screen.

## 8. Notifications & lifecycle
- Debate start push fires reliably to INTERESTED? users.
- Pre-publication invite notifications deliver and surface Accept/Decline.
- 48-hour edit window banner is accurate.
- Auto-advance, completion overlay, and archive transitions run cleanly.

## 9. Content & legal
- Terms, Privacy, Civic verification copy reviewed.
- Account deletion works end-to-end.

## Deferred (tracked, do not block launch)
- Performance analysis specifics (placeholder task in tracker; defined during Part 1 walk).
- Per-device noise profiles.
- Mid-session mic reassignment.
- Audience mic capture.