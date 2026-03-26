

# Fix: Speaker Diarization Not Splitting Speakers Properly

## Problem

The current logic only checks the **first word's** speaker ID (`alt.words?.[0]?.speaker`) and uses that for the entire final segment. If Deepgram returns a segment where multiple speakers talk, or if the speaker label on the first word is unreliable, everything gets clumped under one speaker.

Additionally, the statement buffer only flushes on speaker change or `UtteranceEnd` — with a 5-second `utterance_end_ms`, long stretches of multi-speaker audio get accumulated into one entry.

## Solution

Two changes in `src/hooks/useLiveTranscription.ts`:

### 1. Split final segments by speaker within the word array

Instead of assigning one speaker per final segment, iterate through `alt.words` and split the transcript whenever the `speaker` field changes mid-segment. This creates separate transcript entries for each speaker within a single Deepgram result.

```text
Before: "Hello how are you I'm fine thanks" → one entry, Speaker 1
After:  "Hello how are you" → Speaker 1, "I'm fine thanks" → Speaker 2
```

### 2. Reduce endpointing and utterance end timing

Lower `endpointing` from 3000ms to 1000ms and `utterance_end_ms` from 5000ms to 2000ms. This forces Deepgram to finalize segments more frequently, giving diarization more granular data to work with and reducing the window for speaker clumping.

### 3. Use `multichannel=true` for multi-device mode (future)

For multi-device sessions where each participant has their own mic, each audio stream could be sent on a separate channel. This isn't needed for the immediate fix but is worth noting for future multi-device improvements.

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useLiveTranscription.ts` | Parse `alt.words` array to split by speaker within each final segment; reduce endpointing to 1000ms and utterance_end_ms to 2000ms |

