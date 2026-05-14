---
name: Section 7 — Accessibility & Inclusivity
description: WCAG-aligned launch criteria — keyboard nav, screen reader live regions, colorblind redundancy, reduced motion (flip removed), Projector captions, i18n wrapper
type: feature
---

## Launch criteria

1. **Keyboard navigation**
   - Full keyboard map for debate/live rooms (advance turn, toggle mic/cam, open Argument Map, open Notebook, send message).
   - Visible focus rings on every interactive element (use `focus-visible:ring-foreground/40`).
   - `?` opens a shortcut overlay listing all bindings.

2. **Screen reader (live sessions)**
   - ARIA live region (`aria-live="polite"`) on transcript stream container.
   - Announces only **speaker changes** + **DYNAMO interjections** — NOT every streamed word (would flood VoiceOver/NVDA users).
   - Each transcript card has `aria-label="<speaker> said: <text>"`.

3. **Colorblind redundancy (Performance Intelligence layer — §21)**
   - Colored underlines (green/orange/red) STAY as primary signal.
   - Inside each annotation popup: smiley face (green) / neutral face (orange) / sad face (red) as redundant non-color signal.
   - Faces are inside the popup, not replacing the underline.

4. **Reduced motion**
   - Auto-detect `prefers-reduced-motion: reduce` AND manual toggle in Settings (both honored, OR'd together).
   - Typewriter (DYNAMO) → instant text render.
   - Pulsing timer → static dot.
   - Confetti completion → static badge.
   - **Card flip animation is REMOVED product-wide** (not just for reduced-motion). Replaced with the Transcript / Summary two-tab pattern already live in the Argument Map bubble. Post-session record cards (TranscriptCard.tsx) must adopt the same two-tab pattern.

5. **Projector captions**
   - Toggleable large-type captions overlay in Projector view.
   - Off by default; toggle persists per-device in localStorage.
   - Renders interim + final transcript text at min 32px.

6. **i18n architecture**
   - English-only at launch.
   - All user-facing strings routed through an `i18n` wrapper (e.g. `t("debate.start")`) so v2 can add languages without a refactor.
   - No hardcoded strings in JSX after launch.

## Out of scope for v1
- Additional languages
- Sign-language interpreter integration
- Audio descriptions for video content
