## Goal

The Profile ID card on `/` is currently rendered inside an absolute-positioned overlay with a small fixed min-height (`min-h-[220px]`), while the new card is much taller. This causes:

- The rotating tagline ("What's the story today?") to be visually clipped/overlapped by the ID card.
- The large circular Hero action button (Debate/Live/CMM/Import) to overlap the bottom of the ID card on desktop/tablet.
- A banner that takes up too much vertical space (`aspect-[3/1]` on sm+).

We'll (a) shorten the banner, (b) put the GreetingHeader in normal block flow so subsequent content can never overlap it, and (c) balance vertical rhythm so the ID card and Hero button each occupy roughly half the viewport above the fold.

## Changes

### 1. `src/components/profile/ProfileIdCard.tsx` — shorter banner

- Change banner from `aspect-[5/2] sm:aspect-[3/1]` to a shorter, height-capped style:
  - Use `h-20 sm:h-24 md:h-28` (no aspect ratio) so the banner is a slim strip ~80–112px tall regardless of card width.
- Slightly reduce the negative avatar overlap (`-mt-10 sm:-mt-12` → `-mt-9 sm:-mt-10`) so the avatar still hangs over the shorter banner correctly.
- Friend-code QR stays the same size; the overall card becomes noticeably shorter.

### 2. `src/components/home/GreetingHeader.tsx` — normal flow, no overlap

- Remove the `relative min-h-[...] mb-0` outer wrapper + `absolute inset-0` overlays. Use normal block layout so the parent height grows to fit whichever child is rendered:
  - Greeting state: a single `motion.h2` block.
  - Header state: a single `motion.div` containing the `<ProfileIdCard>` + the Avg badge.
- Keep `AnimatePresence mode="wait"` + the existing fade transition (no behavior change).
- The Avg badge stays as an `absolute top-2 right-2` overlay anchored to the ID card wrapper (already `relative`).
- Logged-out welcome banner: keep as-is but drop the absolute wrapper — render the gradient banner directly so it sizes naturally.

### 3. `src/pages/HomePage.tsx` — tighten spacing between header and hero

- Reduce the gap between GreetingHeader and HeroActionShazam so the ID card and the big circular button visually share the viewport ~50/50 above the fold on desktop/tablet:
  - Change the tagline wrapper `py-6` → `py-3 md:py-4`.
- No structural changes; tagline becomes the breathing room between the two equally-weighted blocks.

### 4. `src/components/home/HeroActionShazam.tsx` — trim vertical padding

- Desktop block: `py-8` → `py-5` so the giant circle sits closer to the tagline and the two halves balance.
- Mobile block: `py-6` → `py-4`.
- Reduce outer wrapper `mb-6` → `mb-4`.

No changes to functionality, data, the carousel, or downstream sections. Edit-mode camera buttons, friend-code copy, QR generation, and the Avg badge logic are untouched.

## Out of scope

- ProfilePage / EditProfilePage layouts (banner height change there is shared automatically via the component — confirmed intentional since the user said all three surfaces should be identical).
- Any backend, RLS, or data changes.
