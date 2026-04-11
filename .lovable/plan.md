

# Defer Per-Entry Summaries to Session End

## Current cost breakdown per 3-minute tick
Each tick runs **two** AI calls:
1. **Pass 1 — Classification** (Gemini 2.5 Pro): subtopic identification + entry mapping
2. **Pass 2 — Summarization** (Gemini 3 Flash): per-entry summaries in batches

For a 30-minute session, that's ~10 ticks = **10 classification calls + 10 summarization calls**.

## Proposed change
- **Keep Pass 1 (classification) running every 3 minutes** — this gives you real-time subtopic grouping during recording.
- **Skip Pass 2 (summarization) during recording** — no per-entry AI summaries while live.
- **Run Pass 2 once at session end** — the `endSession` flow already does a final `runAnalysis()`. We just make Pass 2 only execute during that final pass.

## Cost impact
- Eliminates ~9 out of 10 summarization calls per session (Flash model, cheaper but still adds up).
- Classification (the more expensive Pro model call) remains unchanged — this is the price of real-time structure.
- Net saving: roughly **30-40% of total AI cost per session** (summarization is cheaper per call than classification, but it runs in batches that multiply).

## Changes (1 file)

### `src/hooks/useLiveTranscription.ts` — `runAnalysis` function (~line 130-248)
- Add a parameter `includesSummaries: boolean` to `runAnalysis` (default `false`).
- Wrap the entire Pass 2 block (lines 183-228) in `if (includesSummaries)`.
- In the scheduled timer call (~line 262), call `runAnalysis()` without summaries (default).
- In `endSession` (where the final analysis runs), call `runAnalysis(true)` to include Pass 2.
- During recording, cards will show transcript text only (no `ai_summary`). Once the session ends, all entries get summaries and the record view displays them.

### No other files change
The edge function, UI components, and session record view remain untouched.

