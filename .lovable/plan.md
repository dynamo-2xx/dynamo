## Goal
On the home (`/`) hero action carousel, reorder slides to **Debate → Live → Import → CMM**, and lock CMM behind a "Coming soon…" wall. Tapping CMM triggers a shake animation but does not navigate.

## Changes

**`src/components/home/HeroActionShazam.tsx`**
1. Reorder `SLIDES` array: `debate`, `live`, `import`, `cmm` (CMM last).
2. Add `comingSoon: true` flag on the CMM slide entry.
3. In `handleActivate`:
   - If `slide.comingSoon` → trigger a shake animation, do not navigate, do not call `onUnauth`.
   - Else, existing behavior.
4. Add local `shake` state + helper `triggerShake()` that toggles a class for ~500ms (using `animate-[shake_…]` via inline keyframe defined in `tailwind.config.ts`, or a small CSS utility added to `index.css`).
5. Render a "Coming soon…" overlay badge on the circular button when `slide.comingSoon`:
   - Semi-transparent layer over the black circle (`bg-background/70 backdrop-blur-sm`) with centered small-caps "Coming soon…" text in `font-body`.
   - Icon still faintly visible underneath (reduced opacity).
   - Cursor remains pointer (so shake feedback works), but button is not disabled (we want the click to register for the shake).
6. Apply the shake class to the motion wrapper (both mobile and desktop layouts share the same slide render — keep it DRY by applying to the button wrapper).

**`tailwind.config.ts`** (or `src/index.css`)
- Add a `shake` keyframe (small horizontal translate oscillation, ~5px, 4 cycles, 400–500ms) and matching `animation` utility `animate-shake`.

## Out of scope
- No route changes — `/cmm/new` continues to exist for later unlock.
- No copy changes to other slides.
- No backend / RLS changes.

## Verification
- Visit `/`, swipe/arrow through carousel: order is Debate, Live, Import, CMM.
- CMM slide shows "Coming soon…" overlay; clicking the circle shakes it and does not navigate or open auth prompt.
- Other slides behave exactly as before (auth prompt when logged out, navigate when logged in).
