---
name: Section 7 — Mobile & PWA release criteria
description: Installable PWA shell, mobile room layouts, safe-area, iOS audio unlock, SW update flow, minimal offline shell
type: feature
---

# Section 7 — Mobile / PWA

## Install prompt — BOTH placements
- **One-time chip** in profile drawer ("Install Dynamo"), dismissible, remembers choice.
- **Top-of-Home banner** appears on **second visit onward** for unauthenticated and authenticated users until installed/dismissed. Dismiss persists.
- Capture `beforeinstallprompt` and reuse the saved event for both surfaces.
- iOS Safari: same surfaces show an "Add to Home Screen" instruction sheet (Safari has no `beforeinstallprompt`).

## Manifest
- Ship `manifest.webmanifest` with maskable 192/512 icons, `theme_color: #0a0a0a`, `background_color: #ffffff`, `display: standalone`, `scope: "/"`, `start_url: "/"`.

## Mobile rooms
- **Argument Map (mobile)**: opens **full-screen sheet** (covers transcript). Minimize/maximize + close affordances. **Bottom-right notebook button** stays accessible; tapping Annotate opens a **bottom textbox** wired to the active notebook. Easy open/close.
- **Mic-Prep (mobile)**: own-mic test stays primary. Other-participants bubble strip lives **under the header** (top), not above Ready button.
- All rooms (`<640px`): single-column stack, bottom-sheet overlays, bottom-anchored primary CTAs.

## Safe-area & thumb-zone
- `AppLayout` reserves `env(safe-area-inset-bottom)` and `-top`.
- Primary CTAs move to bottom-anchored bar on mobile.

## iOS audio unlock
- One-time "Tap to enable audio" overlay on first room entry; calls `AudioContext.resume()`.

## Service worker update flow
- Detect new SW → toast "New version available" → `skipWaiting` + reload.

## Offline shell — MINIMAL
- Precache **only `/` and waitlist page** + brand assets. No personalized Home cache.
- Cold-load offline never shows blank page.

## Push parity
- Verify push delivery on iOS 16.4+ installed PWA and Android Chrome before release.
