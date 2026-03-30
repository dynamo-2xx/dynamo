

# Fix: Subtopic Summaries Not Generated for Live Sessions

## Problem

The AI correctly identifies subtopics from the transcript but returns **empty `subtopic_summaries`**. DB evidence confirms this — session `d53813b9` has 7 subtopics but `subtopic_summaries: {}`.

**Root cause**: The entire transcript (325 entries for a 35-min session) is sent to the AI in a single request. The model identifies subtopic labels but fails to produce per-subtopic summaries — likely because generating 5-7 detailed summaries from 325 entries in one tool call exceeds what the model reliably produces.

## Solution: Two-Pass Summarization

Split the summarization into two steps:

1. **Pass 1 — Classify**: Send the full transcript to the AI. Ask it to identify subtopics and assign each entry to a subtopic (current behavior, works fine). No summaries requested here.

2. **Pass 2 — Summarize per subtopic**: For each identified subtopic, send only the entries assigned to that subtopic and ask for a focused summary. This keeps each request small and focused.

## Changes

### 1. Edge function: `supabase/functions/analyze-transcript/index.ts`

- Add a new mode `"live_summarize_subtopic"` that accepts a subtopic label and a filtered list of entries, and returns a single summary string.
- Simplify the existing `live_conversation` mode to only return subtopics and entry assignments (remove `subtopic_summaries` from its tool schema since it's not reliably produced).

### 2. Hook: `src/hooks/useLiveTranscription.ts`

- Update `generateSummary()` to:
  1. Call `analyze-transcript` with `mode: "live_conversation"` to get subtopics + entry mapping
  2. For each subtopic, call `analyze-transcript` with `mode: "live_summarize_subtopic"` passing only that subtopic's entries
  3. Collect all per-subtopic summaries into `subtopic_summaries` map
  4. Save the complete summary object to state and DB

### 3. No UI changes needed

`SessionRecordView` already reads from `subtopic_summaries` correctly — once the data is populated, summaries will appear.

## Technical Details

**New edge function mode payload** (`live_summarize_subtopic`):
```json
{
  "mode": "live_summarize_subtopic",
  "subtopic": "VC Pitch Strategy: Framework and Execution",
  "entries": [{ "speaker": "Speaker 1", "text": "..." }, ...]
}
```

**Returns** (via tool call):
```json
{ "summary": "Speaker 1 discussed... Speaker 2 argued..." }
```

**Parallelization**: The per-subtopic summary calls can be made in parallel (`Promise.all`) since they're independent, keeping total latency reasonable even with 5-7 subtopics.

**Model**: Keep `google/gemini-3-flash-preview` — it handles single-subtopic summaries well. The issue was volume per request, not model capability.

