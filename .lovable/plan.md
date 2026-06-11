## Why it looks glitchy today

Two root causes are stacking on top of each other:

1. **The room isn't actually a "video meeting".** In single-device mode the whole `videoBlock` is gated off, so there's no camera tile, no mic toggle, no cam toggle — just a transcript pane over the page background, which reads as a giant empty grey slab when the transcript is short.
2. **The "grey blob" + "inverted look" is a theme bug.** `themeWrapperClass` adds a scoped `.dark` wrapper around just the live panel. The transcript scroller (`bg-background/70 backdrop-blur-xl`) and collapsibles (`bg-background/60 backdrop-blur-xl`) flip token values inside that wrapper, so white@70 over dark becomes mid-grey, while the header sits outside the wrapper and stays light — that's the half-and-half "inverted" effect.

On top of that, the dark theme in `index.css` is the light tokens flipped on the lightness axis — same hues, no distinct dark identity.

The `DisplayOptionsMenu` (Layout / Tile style / Density / Show-hide toggles / Theme) compounds the problem: 4 layout presets × 3 tile styles × 3 densities × 4 themes = combinations we can't QA, and it overwhelms users before the basic room even works.

## What we'll build

### A. Live room becomes a Zoom-like meeting

```text
┌──────────────────────────────────────────────────────────┐
│ ← Recording · test!!!!   ⏱ 56:40   ⏸  Share  End         │  header (compact, overflow-safe)
├──────────────────────────────────────┬───────────────────┤
│                                      │  ▼ General Disc.. │
│           [ video stage ]            │  ▼ Sound check    │
│   ┌────────┐  ┌────────┐             │  ─────────────    │
│   │ You    │  │ Speaker│             │  • argument map   │
│   │ 🎤 📹  │  │ 2      │             │    (transcript /  │
│   └────────┘  └────────┘             │    threaded       │
│                                      │    record)        │
│  [🎤 Mute]  [📹 Camera]              │                   │
└──────────────────────────────────────┴───────────────────┘
```

- **Always-on local camera tile.** `getUserMedia({ video: true })` for a local preview regardless of `mode`. In multi-device the same `MediaStream` is published via `useLiveSessionRTC` as today; in single-device it stays local-only.
- **Mic + camera toggle buttons always visible** in a Zoom-style control bar pinned to the bottom of the video stage. Driven by a single `useLocalMedia()` hook so the controls behave identically in single- and multi-device.
- **Argument map docked to the right** on tablet/desktop (≥ 768px), collapsing to a bottom sheet on phone. The "argument map" surface = the existing transcript / threaded record view (same `transcriptBlock` content), retitled and tucked into the side panel.
- **One fixed layout.** Side-by-side video + argument map on ≥ 768px; stacked (video on top, argument map below) on phones. No layout picker, no tile-style picker, no density picker.
- **Header overflow fix.** Group `⏸ Share End` into one trailing cluster with consistent 32px buttons; "Resume (3:20)" pill collapses to `▶ 3:20` under 900px so the title never collides with controls.
- **Kill the translucent stack.** Replace `bg-background/70 backdrop-blur-xl` on the transcript scroller and `bg-background/60 backdrop-blur-xl` on collapsibles with solid `bg-card` + `border-border`. No more half-lit grey slab.

### B. Delete the Display Options menu entirely

- Remove `DisplayOptionsMenu` from the live room header.
- Remove the prefs it owns: `layout`, `tileStyle`, `density`, `showTimestamps`, `showTileLabels`, `showInterim`, `groupBySubtopic`, `theme`. Hard-code the single good defaults in the new layout: timestamps on, tile labels on, interim text on, group by subtopic on, side-by-side layout, grid tiles, comfortable density.
- Delete `src/hooks/useLiveDisplayPrefs.ts` and the `DisplayOptionsMenu` component.
- Theme is no longer user-selectable per session — the live room follows the app's global light/dark theme.

### C. Distinct light & dark themes (not inversions)

Introduce **two purpose-built palettes** for the live room, scoped under `[data-live-theme="light"]` and `[data-live-theme="dark"]`. The attribute is set from the app's global theme (`light` or `dark`), not from a per-session picker.

| Token | Light theme (`Studio`) | Dark theme (`Atrium`) |
|-------|------------------------|------------------------|
| Stage background | Warm paper `#F7F5F0` | Deep slate `#0E1116` |
| Video tile bg (cam off) | Cool stone `#1E2024` | Onyx `#1A1D22` (same family as stage, not flipped) |
| Side panel bg | Pure white `#FFFFFF` | Graphite `#15181D` with 1px inner highlight `rgba(255,255,255,0.04)` |
| Card / collapsible | `#FFFFFF` + `0.5px rgba(0,0,0,0.08)` | `#1B1F25` + `0.5px rgba(255,255,255,0.06)` |
| Primary text | `#0A0A0A` | `#ECEEF1` (warm white, not pure) |
| Muted text | `#5B6066` | `#8A9099` |
| Accent (Recording) | Coral `#E04E3A` | Coral-warm `#F26A55` (lifted for contrast on dark) |
| Resume / pause CTA | Amber `#E89B12` on white | Amber `#F0B748` on dark |
| Tile border / dividers | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.05)` |
| Shadow language | Soft drop, 0 2px 8px rgba(0,0,0,0.04) | No shadows; rely on contrast + 0.5px borders |

Key differences (so they don't read as inversions):
- **Light = paper.** Warm off-white stage, white cards, no glow.
- **Dark = studio control room.** Cool slate stage, graphite panels, no pure black, no `invert`. Borders replace shadows. Coral and amber accents are tuned per theme.

The global app `--background` / `--foreground` tokens stay untouched. The live room reads its own tokens from a small scoped CSS block, so theme decisions can never bleed into the rest of the app and the half-lit slab can't recur.

## Files touched

- `src/pages/LiveSessionPage.tsx` — header restructure, always-on video stage, side panel layout, drop `videoBlock` `isMulti` gate, remove translucent backgrounds, remove `DisplayOptionsMenu` mount and all `prefs.*` reads.
- `src/components/live/VideoGrid.tsx` — render local tile even with no peers; ensure tile fills container; Zoom-style control bar.
- `src/components/live/SessionControls.tsx` *(new)* — mic / camera buttons; binds to `useLocalMedia`.
- `src/hooks/useLocalMedia.ts` *(new)* — wraps `getUserMedia`, exposes `{ stream, micOn, camOn, toggleMic, toggleCam }`; multi-device passes the stream into `useLiveSessionRTC`.
- `src/components/live/DisplayOptionsMenu.tsx` — **deleted**.
- `src/hooks/useLiveDisplayPrefs.ts` — **deleted**. Anything that still imports `themeWrapperClass` switches to reading the global theme.
- `src/components/live/FloatingTranscript.tsx` — solid surface, no backdrop-blur.
- `src/index.css` — add `[data-live-theme="light"]` and `[data-live-theme="dark"]` blocks with the new token set above; no changes to global `:root` / `.dark`.
- `src/components/live/PresenceList.tsx`, `JoinCodeCard.tsx` — restyle to read the new live-scoped tokens.

## Out of scope

- WebRTC topology / signaling changes — single-device stays local-only, multi-device stays mesh.
- Transcript pipeline, Deepgram config, AI facilitation, summaries.
- The global app light/dark theme (only the live room gets the new dual palette).
- The "Pause pauses the timer" change you already shipped.

## Acceptance check

1. Open `/live/:id` in single-device mode → see your own camera tile (or a "Camera off" placeholder), mic + cam toggle buttons, argument map docked right.
2. No Display Options gear in the header.
3. Pause → header doesn't overflow at 877px viewport.
4. Switch the app to dark mode → live room renders the `Atrium` palette: graphite cards, deep slate stage, warm coral/amber accents. No section reads as half-lit.
5. Switch the app to light mode → warm paper stage, white cards with hairline borders, no shadows on dark elements.
6. Resize to 375px wide → video stage is full-width on top, argument map stacks below.
