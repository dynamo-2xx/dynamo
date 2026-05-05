## User story (confirmed)

Subtopic (collapsible) → Argument thread (collapsible, AI-labeled) → Argument summaries (color-coded by side). No transcript text in the threaded record — full transcript stays behind the bottom toggle.

## Data source

Use existing `round_summaries.key_arguments` (per subtopic). Each subtopic gets one synthetic "thread" per side. The thread label is the side name; its contents are that side's `key_arguments` rendered as short, color-coded summary rows.

```text
[Subtopic ▸] Peak Dominance and Playoff Efficiency           2 threads
   [Thread ▸] Yes — Jordan                                   3 summaries
       • Jordan went 6-0 in the Finals…
       • Highest career playoff scoring avg (33.4)…
   [Thread ▸] No — LeBron                                    2 summaries
       • 20+ year peak with elite scoring + playmaking…
       • All-time leading scorer, top-5 in assists…
```

When a subtopic has no `round_summaries` row yet (mid-debate), show "Summaries pending" inside that subtopic — never raw transcript.

## Changes

### 1. `src/hooks/useDebatePreviewThreads.ts`
Replace the current root-argument chain logic. New shape per subtopic:

```ts
PreviewSubtopic = {
  id, title,
  threads: PreviewThread[],   // one per side that has key_arguments
}
PreviewThread = {
  id: `${subtopicId}:${sideLabel}`,
  title: sideLabel,
  summaries: { id, side: sideLabel, content: string }[],
}
```

Build by reading `round_summaries.key_arguments` and grouping items by `side`. Drop the `kind/speakerLabel/text` statement model entirely (no more transcript leakage). Keep `sideLabels` for color mapping.

### 2. `src/components/debate/DebateRecordPreview.tsx`
- Outer `<Collapsible>` per subtopic (already exists) — header shows "N threads" where N = `threads.length`.
- **New** inner `<Collapsible>` per thread (default closed). Header: chevron, color-coded side label, count "K summaries".
- Body: list of `summaries`, each rendered as a single short row with a colored bullet/dot matching the side's `SIDE_CLASS` color and the summary text.
- Remove `StatementRow` and the "Argument summary" sibling block I added last turn — both go away.
- Empty state per subtopic: "Summaries pending" (replaces the ghost preview cards for live/completed; ghosts still OK for scheduled/draft).

### 3. No backend changes
RLS already covers `round_summaries` SELECT via `can_view_debate`. No migration.

## Out of scope (unchanged)
- Hero, sides chips, "About this debate", edit-window inline notice, "Show full transcript" toggle, comments, completion overlay.