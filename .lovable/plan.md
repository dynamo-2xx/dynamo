

The user wants me to implement the previously-discussed scope (auto-collapsing "d." narration, removing the redundant top-right permissions button, and converting the argument map into a translucent overlay opened via a map button), then test it end-to-end and return screenshots.

Combining all approved scope into one consolidated plan:

# Plan: Debate Room polish — d. button, permissions consolidation, map overlay, plus E2E test

## Implementation

### 1. Auto-collapsing "d." narration
- `DebateRoomPage.tsx`: add `aiMessageStreaming` and `aiMessageCollapsed` state. Set streaming true while `streamAI` reads SSE; on completion, schedule a 5s `setTimeout` to collapse. Reset (re-open + pulse) when `aiMessage` content changes for a new turn. Cancel timer on unmount or speaker timer start.
- New shared component `src/components/debate/IconCircleButton.tsx`: 28x28 circular button (`bg-primary/10`, `border-primary/20`), accepts icon or text content + optional pulse prop. Used for d., map, notebook.
- New `src/components/debate/DLogoButton.tsx` thin wrapper rendering `d.` in Instrument Serif.

### 2. Argument map → translucent overlay
- New `src/components/debate/ArgumentMapOverlay.tsx`: `AnimatePresence` floating panel anchored top-left over camera area. `bg-background/70 backdrop-blur-xl`, rounded-2xl, soft shadow, `max-h-[70vh]` scrollable, header with title + close `×`, click-outside to close. Renders existing `LiveArgumentMap` inside.
- Map button uses `Map` from `lucide-react`, same circle styling.

### 3. Consolidate permissions into bottom console
- Remove `<MediaPermissions variant="header" />` from `DebateRoomPage.tsx` header.
- In `ParticipantSharedView.tsx` and `FacilitatorView.tsx` bottom console:
  - Camera button's first-press handler: if no `localStreamRef`, call `getUserMedia({ video: true })` first, then toggle. Show inline error toast on permission denied.
  - Mic button: same pattern with `{ audio: true }` before starting Deepgram.

### 4. Stack of circle buttons in metadata row
Vertical stack to the left of timer (top→bottom): `[d.]`, `[map]`, `[notebook]`. All three share `IconCircleButton` styling. Conditionally render d. only when `aiMessage` exists; map only when arguments exist; notebook stays as-is.

### 5. Files touched
- `src/pages/DebateRoomPage.tsx` — state + remove header MediaPermissions + prop drilling
- `src/components/debate/ParticipantSharedView.tsx` — buttons, overlay, permission flow
- `src/components/debate/FacilitatorView.tsx` — same
- `src/components/debate/IconCircleButton.tsx` — NEW
- `src/components/debate/DLogoButton.tsx` — NEW
- `src/components/debate/ArgumentMapOverlay.tsx` — NEW

## Testing & deliverable

After implementation, navigate to a debate room in the preview, capture screenshots showing:
1. Header without the redundant permissions button
2. The three stacked circle buttons (d., map, notebook) in the metadata row
3. d. narration auto-collapsed → click reopens the panel
4. Map button opens the translucent argument map overlay over the camera
5. Bottom console camera/mic buttons triggering permission flow

Return the screenshots inline as confirmation.

## Out of scope
No DB/edge function changes. Threaded-arguments work from prior approved plans is unaffected.

