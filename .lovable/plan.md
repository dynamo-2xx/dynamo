# Performance Analysis v2 — Plan

Scope: replace the current 4-group / 3-severity annotation system with the new **50-tag polarity** system, wire up the in-session **Insights overlay** per image 1, and delete the now-unused `FloatingIntelligence` bubble. The post-session dashboard is the **next** task and is out of scope here.

CMM is excluded for v1. Applies to Debate, Live, and Imported records.

---

## 1. Tag taxonomy (single source of truth)

New file `src/lib/perf-tags.ts` (also imported by the edge function via a symlinked `supabase/functions/_shared/perf-tags.ts` re-export) containing the 50 tags from the guidelines:

```ts
export type Polarity = "positive" | "negative";
export type PerfTag = {
  label: string;          // e.g. "Strong evidence"
  polarity: Polarity;
  description: string;    // shown in tooltip
  guidance: string;       // used in AI prompt + tooltip detail
  contextual: boolean;    // true = post-session only (needs cross-turn context)
};
export const PERF_TAGS: Record<string, PerfTag> = { ... };
```

The exact 50 labels/descriptions/guidance come verbatim from the pasted guidelines.

## 2. Database migration

Additive — keep existing columns nullable for back-compat, deprecate later.

`performance_annotations` new columns:
- `tag_label text` — one of the 50 tag keys
- `polarity text` — `'positive' | 'negative'` (CHECK constraint)
- `cited_entry_ids uuid[]` — other transcript entries this tag cites (context tags)
- `span_text text` — the exact substring underlined (so we can re-anchor if offsets drift)

Existing `attribute_group`, `sub_attribute`, `severity` become nullable. `pass_kind` stays. Backfill not needed (premium-only, low volume so far).

Index: `(session_id, session_kind, participant_id, pass_kind)`.

RLS: unchanged (still gated via `can_view_debate` / equivalent).

## 3. Edge function rewrite

`supabase/functions/analyze-performance/index.ts` becomes a **dispatcher** on `pass`:

**Live pass** (model: `google/gemini-3-flash-preview`)
- Input: one argument unit = one transcript entry (skip live segmentation in v1)
- Single AI call, prompted with the subset of NON-contextual tags
- Output schema: `{ annotations: [{ tag_label, polarity, span_text, explanation }] }`
- Writes rows with `pass_kind='live'`, `contextual=false` tags only

**Deep pass** (model: `google/gemini-2.5-pro`) — runs once on session end (already chained off `consolidate-session` via `trigger-deep-perf`)
- Pass 1 (Segmentation): full transcript → argument units grouped under existing subtopics
- Pass 2 (Tagging): each unit → tags from the FULL 50 (including contextual, which may produce `cited_entry_ids`)
- Pass 3 (Threaded summaries): each subtopic → re-generates the existing threaded-record summary with embedded tag references (writes back via existing `analyze-transcript` storage, not a new table)
- Deletes prior `pass_kind='deep'` rows for the session, inserts fresh ones

Both passes share the tag taxonomy and prompt scaffolding from `_shared/perf-tags.ts`.

## 4. Frontend — toggle relocation

- **Delete** `src/components/insights/FloatingIntelligence.tsx` and remove its mount from `RecordToolsMount` / debate room.
- Move the toggle into `ArgumentMapOverlay` header next to the "Threaded Record / Transcript" tabs.
- Toggle state lives in a new `useInsightsOverlay()` hook (session-scoped, default OFF for free, hidden for free).
- When ON: render the 2 polarity chips (🟢 positive / 🔴 negative) — disabled state if count = 0.
- When OFF: chips collapse, no underlines, no pills.

## 5. Frontend — overlay rendering

New component `src/components/insights/InsightSpan.tsx`:
- Wraps a substring of an entry's text
- Renders `<span>` with underline color = polarity (green / red)
- After the span: small pill `<TagPill label polarity isPostSession />` with tooltip on hover
- Post-session deep-pass tags get an amber dot/badge on the pill
- Tooltip uses Radix Tooltip (already installed), inline in document flow — no fixed positioning
- Tooltip content: tag label, description, AI explanation, and "Discuss in Dynamo" button (injects quoted block as first user message in DynamoChatPane)

New helper `src/lib/applyInsightSpans.ts` — takes raw entry text + array of annotations (with `span_text`) → returns React fragment array with `InsightSpan` wrappers around matched substrings. Handles overlapping spans by nesting.

Integration points (3 surfaces, identical rendering):
1. **Live transcript bubble** (`SpeakerBubble.tsx` / `TranscriptPane.tsx`) — streams in via existing `usePerformanceAnnotations` realtime
2. **Threaded record view** (`ArgumentMapOverlay` threaded tab) — applies to each thread's key-argument summary
3. **Record archive transcript pane** — same wrapping

Streaming: `usePerformanceAnnotations` already subscribes to inserts; new pills/underlines appear as soon as each row lands (~2-5s after turn ends).

## 6. Speaker name on every entry

Add a subtle speaker name label above (or beside, small + muted) the content of:
- Every transcript entry bubble (`SpeakerBubble.tsx`) — already shows it, verify styling matches: 0.75rem, `text-muted-foreground`, DM Sans
- Every threaded-record summary card — currently doesn't show it; add the resolved name via `resolveSpeakerName()` in the threaded card component

Format: small DM Sans text, `text-xs text-muted-foreground/70`, placed directly above the content block, no avatar.

## 7. Cleanup

- Delete `FloatingIntelligence.tsx` and its routes/mounts
- `PerformanceInsightsToggle.tsx` becomes the new in-overlay toggle (rewritten, kept name)
- `IntelligencePage.tsx` stays for now (will be replaced when we build the post-session dashboard next)
- Update `hooks/usePerformanceAnnotations.ts` return type to include new fields

## 8. Out of scope (next task)

- The post-session **Performance Dashboard** at `/intelligence/:kind/:id` — full redesign comes after this lands.
- CMM integration.
- Cross-session trends.

---

## Technical sequence

1. Migration (additive columns + check constraint)
2. `src/lib/perf-tags.ts` + shared edge function copy
3. Rewrite `analyze-performance/index.ts` (live + deep dispatch)
4. New `InsightSpan` + `applyInsightSpans` + `TagPill`
5. Rewrite `PerformanceInsightsToggle` for in-overlay placement; delete `FloatingIntelligence`
6. Wire into `ArgumentMapOverlay`, `SpeakerBubble`, threaded-record cards, record-archive transcript
7. Add speaker name to threaded-record summary cards
8. Verify streaming on a live session and post-session deep pass overwrite