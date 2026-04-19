

## Plan: Minimal status bar + Full Display Options (A–E) + Floating Transcript

### 1. Shrink "Connected" status bar
Single ~24px row pinned at the bottom of the live panel:
- `h-6 px-3 py-0.5 flex items-center gap-1.5 bg-background/60 backdrop-blur-md border-t border-foreground/10`
- Tiny mic icon + status text at `text-[11px]`
- Strip the wrapper padding that's creating today's empty band

### 2. Display Options menu (all of A–E)

**Trigger:** small Sliders icon button in the live panel header, opens a translucent popover.

**A. Layout preset**
- Stacked (video top, transcript below) — default
- Side-by-side (video left, transcript right) — desktop only, falls back to Stacked on mobile
- Transcript-first (large transcript, video as small thumbnails on top)
- Video-only (transcript hidden; reveals a floating transcript button — see §3)

**B. Tile style**
- Grid (equal tiles) — default
- Speaker focus (active speaker large, others as thumbnails along the side)
- Compact (smaller tiles, more fit on screen)

**C. Transcript density**
- Comfortable (current) — default
- Compact (tight padding, smaller avatars, smaller text)
- Cinema (large text, high contrast — for projection / accessibility)

**D. Show/hide toggles**
- Show timestamps on bubbles
- Show speaker name labels on video tiles
- Show interim (in-progress) transcript text
- Show subtopic dropdowns vs flat transcript

**E. Theme override (this session only)**
- Auto / Light / Dark / High-contrast
- High-contrast = boosted borders + opaque bubbles for readability

**Persistence:** all selections stored in `localStorage` under `dynamo:live:display-prefs`. No DB changes.

### 3. Floating draggable transcript (Video-only mode)

When layout = Video-only, a small "Transcript" pill button appears (bottom-right of the video area). Clicking it opens a draggable translucent bubble:

- Reuses the existing `FloatingOverlay` component (same one powering NotebookOverlay / ArgumentMapOverlay)
- ~320×400px, drag handle at top, close button
- Body = `LiveThreadView` in `bubble` mode + `compact` density
- Position persisted via `FloatingOverlay`'s built-in `storageKey` ("live-transcript")
- Same translucent treatment as the rest of the live UI

### Files to touch
```text
src/pages/LiveSessionPage.tsx                     — shrink status bar, add Display button + apply layout/prefs
src/pages/LiveJoinPage.tsx                        — same status bar + Display button + apply prefs
src/components/live/DisplayOptionsMenu.tsx (NEW)  — popover with A/B/C/D/E controls
src/hooks/useLiveDisplayPrefs.ts (NEW)            — localStorage prefs hook (typed prefs object + setter)
src/components/live/VideoGrid.tsx                 — accept tileStyle, showLabels props; speaker-focus layout
src/components/live/LiveThreadView.tsx            — accept density, showTimestamps, showInterim, flat-vs-grouped props
src/components/live/LiveTranscriptBubble.tsx      — density variants (comfortable/compact/cinema), conditional timestamp
src/components/live/FloatingTranscript.tsx (NEW)  — wraps FloatingOverlay + LiveThreadView for Video-only mode
```

No DB migrations. No edge function changes. RLS untouched.

### Verification
1. Status bar is a thin strip flush at the bottom — no empty band.
2. Display button opens popover; each control updates live without reload.
3. Side-by-side splits the panel 50/50 on desktop; collapses to Stacked under 768px.
4. Speaker-focus enlarges the tile of whoever is currently speaking (uses interim-text presence as the signal).
5. Cinema density scales transcript text to ~18px with stronger contrast.
6. Toggling Hide timestamps / Hide labels / Hide interim works instantly.
7. Theme override flips just the live panel's color tokens, not the whole app.
8. Video-only hides the transcript area and reveals the Transcript pill; clicking it opens a draggable bubble that remembers position.
9. Refreshing the page restores all prefs.

### Confidence
- Status bar fix: **99%**
- Prefs framework + persistence: **96%**
- A (layouts) + B (tile styles) rendering correctly across viewports: **91%**
- C/D toggles: **97%**
- E (theme override scoped to live panel only): **88%** — moderate risk; will scope via a CSS class wrapper rather than touching global theme context
- Floating draggable transcript (reusing FloatingOverlay): **96%**

Overall: **~94%**.

