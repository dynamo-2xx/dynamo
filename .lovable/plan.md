

# Debate Detail Page — Apple Music Album Style

## Concept
Clicking a debate card on the Explore page navigates to `/explore/:debateId`, a new page modeled after the Apple Music album detail view. The debate topic replaces the album title, a generated visual/gradient replaces the album art, and subtopics with their argument threads replace the tracklist.

## Layout (mirroring the Apple Music screenshot)

```text
┌──────────────────────────────────────────────────┐
│  ← Back to Explore                               │
├──────────────────────────────────────────────────┤
│  ┌─────────────┐   Debate Topic (large heading)  │
│  │             │   Community / Category           │
│  │  Generated  │   Status · Date                  │
│  │  Visual     │                                  │
│  │  (gradient  │   "Description text that gives   │
│  │   square)   │    context about the debate..."  │
│  │             │                                  │
│  └─────────────┘   [8 participants] [34 args]     │
├──────────────────────────────────────────────────┤
│  SUBTOPICS                                        │
│  ─────────────────────────────────────────────── │
│  1   Infrastructure Costs          5 arguments ···│
│  2   Environmental Impact          3 arguments ···│
│  3   Community Displacement        4 arguments ···│
│  4   Economic Benefits             6 arguments ···│
│  ─────────────────────────────────────────────── │
│                                                   │
│  Clicking a row expands inline to show the        │
│  argument thread (using LiveArgumentMap style)     │
└──────────────────────────────────────────────────┘
```

## Files

### 1. New page: `src/pages/ExploreDebateDetailPage.tsx`
- Hero section: side-by-side layout (image left, metadata right) on desktop; stacked on mobile
- Generated visual: a gradient square using the debate's mock ID as a seed for color variation (no real images needed)
- Metadata: topic (Instrument Serif, large), community badge, status pill (LIVE/Completed), date, participant/argument counts, description with "MORE" truncation
- Subtopic tracklist: numbered rows with subtopic name, argument count, and expand chevron
- Expanded row: shows argument threads inline using the same threaded rendering pattern from `LiveArgumentMap` (side-colored border-left nodes with labels)
- Back button navigates to `/explore`
- All data is hardcoded mock data (2-3 debates with 3-5 subtopics each, 2-4 arguments per subtopic)

### 2. Update `src/pages/ExplorePage.tsx`
- Wrap each debate card (featured, trending, latest) with a `Link` or `onClick` + `navigate` to `/explore/:id`
- Add mock IDs to the debate data objects

### 3. Update `src/App.tsx`
- Add route: `/explore/:debateId` → `<ExploreDebateDetailPage />`

### Design tokens
- Follows existing branding: white bg, Instrument Serif headings, DM Sans body, 0.5px borders, monochrome palette
- Purple accent for subtopic labels (per branding memory)
- Row hover state matches existing `hover:border-foreground/20` pattern
- Framer Motion entrance animations consistent with Explore page

### No backend changes
Purely UI with mock data. No database, edge function, or auth changes.

