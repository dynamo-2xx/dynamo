

# Fix Squished/Narrow Serif Font Rendering

## Root Causes
1. **Dark mode thinning**: Light-on-dark text gets subpixel anti-aliasing that makes strokes thinner, causing serif letters to look horizontally condensed. This is a well-known rendering issue.
2. **Potential font load race**: The `@import` for Google Fonts can be slow; if Instrument Serif hasn't loaded yet, the `serif` fallback (Times New Roman) is noticeably narrower.

## Changes (2 files, visual-only)

### 1. `index.html` — Add font preconnect + preload
Add `<link rel="preconnect">` for Google Fonts and a `<link rel="preload">` for the stylesheet before the page renders. This ensures Instrument Serif loads before first paint instead of relying on a CSS `@import` which blocks later.

### 2. `src/index.css` — Fix rendering
- Add `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` to the `body` rule. This switches from subpixel to grayscale anti-aliasing, which renders consistent stroke widths in both light and dark mode.
- Move the Google Fonts `@import` to a `<link>` in `index.html` instead (faster loading, avoids render-blocking CSS import).
- Remove the `@import` line from `index.css`.

### No logic changes
No routing, Supabase, auth, debate room, or live session code is touched.

