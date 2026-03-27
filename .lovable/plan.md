

# Prep Phase Overlay: Side-by-Side Layout + Ready Button Fix

## Current Issues
1. **Outgoing role**: Transcript and AI Summary are stacked vertically, wasting horizontal space
2. **Ready button visibility**: May be pushed off-screen on smaller viewports due to vertical stacking
3. **Incoming role (timer view)**: Already has a Ready button — no layout issue, just confirm it works

## Changes — `src/components/debate/PrepPhaseOverlay.tsx`

### 1. Widen the container
Change `max-w-lg` to `max-w-4xl` for the outgoing role so the side-by-side layout has room.

### 2. Side-by-side layout for outgoing role
Replace the vertical `space-y-4` stack with a two-column grid:
- **Left column**: Your Transcript (read-only card, scrollable)
- **Right column**: AI Summary (editable textarea + Save button)
- Use `grid grid-cols-2 gap-4` with each column taking equal space
- Both columns get `max-h-[50vh] overflow-y-auto` so content scrolls without pushing the Ready button off-screen

### 3. Header + timer above the grid
Keep the title ("Review Your Summary"), subtitle, and countdown timer centered above the two-column grid.

### 4. Ready button below the grid
Place the "I'm Ready" button centered below both columns, always visible. Move `ReadyButton` to be a simple inline JSX block (not a nested component) to avoid React warnings.

### 5. Incoming role — no layout change
The incoming timer view already shows the Ready button. No changes needed other than the ReadyButton inline fix.

### Layout sketch
```text
┌──────────────────────────────────────────┐
│        Review Your Summary               │
│        Edit the AI summary...            │
│              2:00                         │
├────────────────────┬─────────────────────┤
│  YOUR TRANSCRIPT   │  AI SUMMARY         │
│                    │                      │
│  (read-only,       │  [editable textarea] │
│   scrollable)      │  [Save Changes]      │
│                    │                      │
├────────────────────┴─────────────────────┤
│            [ I'm Ready ]                 │
└──────────────────────────────────────────┘
```

