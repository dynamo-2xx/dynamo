

# Implementation Plan: Live Session Continuous AI Analysis with Flippable Cards

## Overview

Transform Live recording from batch summarization to continuous, real-time AI analysis with debate-style flippable TranscriptCards grouped by dynamically discovered subtopics.

## Changes (4 files)

### 1. Edge Function: `supabase/functions/analyze-transcript/index.ts`

**Modify `live_conversation` mode (Pass 1 — Classify):**
- Switch model from `gemini-3-flash-preview` to `gemini-2.5-pro`
- Add `previous_subtopics` input parameter for stability
- Replace generic system prompt with the full 13-pattern few-shot prompt (definitions, all patterns with examples, signal-action reference table)
- Tool schema stays: `subtopics`, `entry_subtopic_map`
- Remove `subtopic_summaries` from the tool schema (already done)

**Rename `live_summarize_subtopic` → `live_summarize_entries` (Pass 2 — Per-entry summaries):**
- Accepts `entries` array (each with `id`, `speaker`, `text`)
- Returns `entry_summaries: Record<string, string>` (entry_id → concise 1-2 sentence summary)
- Model: `gemini-3-flash-preview`
- Batches of ~50 entries max per call

### 2. Hook: `src/hooks/useLiveTranscription.ts`

- Add `ai_summary?: string` to `LiveTranscriptEntry` interface
- Add progressive auto-analysis timer:
  - Formula: `interval = 30 + Math.floor(elapsedSeconds / 30) * 5`
  - Uses `setTimeout` (not `setInterval`), recalculates after each run
  - `recordingStartRef` tracks when recording began
  - `lastAnalyzedCountRef` prevents redundant calls when no new entries
  - Guard against concurrent runs (skip if already summarizing)
- Rewrite `generateSummary()` as two-pass:
  1. Pass 1: send full transcript + `previous_subtopics` → get `subtopics` + `entry_subtopic_map`
  2. Pass 2: batch entries missing `ai_summary` (or whose subtopic changed), send to `live_summarize_entries` → get `entry_summaries` map
  3. Apply results: update subtopics, entry subtopic assignments, and `ai_summary` on each entry
  4. Persist to DB
- Auto-retry: entries without `ai_summary` after a failed Pass 2 will be re-sent on next tick
- Remove `generateSummary` from returned API (timer handles it); keep `endSession` calling final pass
- Clean up timer on disconnect/unmount

### 3. Recording UI: `src/pages/LiveSessionPage.tsx`

- Replace per-speaker textbox blobs with subtopic-grouped sections
- Group `transcriptEntries` by `subtopic` field using `useMemo`
- Render collapsible subtopic sections (using existing `Collapsible` component)
- Inside each section: `TranscriptCard` per entry with `autoFlip = true`, using `speaker_label` as `speakerSide`, `speaker_id % 2` as `sideOrder`
- Unassigned entries (no subtopic yet) shown in "Uncategorized" section
- Remove "Generate Summary" button and bottom summary drawer
- Add small "Analyzing..." indicator when `isSummarizing` is true
- Keep: recording header, mic status, end button, error banners, interim text

### 4. Record Page: `src/components/live/SessionRecordView.tsx`

- Replace subtopic summary paragraphs (the `Zap` summary block) with `TranscriptCard` components per entry under each subtopic section
- Each card shows transcript on front, `ai_summary` on back
- Remove the `Zap`/summary paragraph layout
- Keep "Full Transcript" collapsible with `SpeakerBubble` entries at bottom

### 5. No Database Changes

`transcript_entries` JSONB already supports arbitrary fields — `ai_summary` and `subtopic` are already stored there.

## Technical Details

**Progressive timer examples:**
- 0:00–0:29 → 30s, 0:30–0:59 → 35s, 1:00–1:29 → 40s, 5:00 → 80s, 10:00 → 130s

**Pass 2 batching:** entries batched in groups of ~50 to avoid the empty-summary bug from overloading a single request.

**Race condition guard:** `isSummarizing` flag prevents overlapping analysis runs. Timer skips if a run is already in progress.

**Classification prompt:** ~2,500 words including all 13 communication patterns, definitions, and signal-action table. Sent to `gemini-2.5-pro` which handles the context size well.

