

# Change Live Session Analysis Interval to 3 Minutes

## What changes
**One file: `src/hooks/useLiveTranscription.ts`**

### Change 1: Fixed 3-minute interval (line 260)
Replace the progressive timer formula:
```typescript
const interval = (30 + Math.floor(elapsedSeconds / 30) * 5) * 1000;
```
With a fixed 3-minute interval:
```typescript
const interval = 180_000; // 3 minutes
```

The `elapsedSeconds` calculation on line 259 and `recordingStartRef` become unused but are harmless to leave (they don't affect behavior). Alternatively, we can remove the `elapsedSeconds` line for cleanliness.

### Change 2: No change needed for end-of-session analysis
The `endSession` function (line 448–478) already resets `lastAnalyzedCountRef` to 0 and calls `await runAnalysis()` before marking the session ended. This guarantees a final analysis pass. No modification needed.

**Nothing else changes.**

