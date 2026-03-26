

# Debate Room: Sidebar Filtering, Directional Messages, and Live Subtitles

## Three Changes

### 1. Sidebar: Only show items with AI summaries

**Current**: The sidebar argument map shows all transcript entries and arguments, regardless of whether they have an AI summary.

**Change**: Filter `getSubtopicItems()` in `ParticipantSharedView.tsx` to only include items that have a non-empty `aiSummary`. Unsummarized transcripts are still persisted in `debate_transcripts` for the post-debate archive but won't appear in the live sidebar.

**File**: `src/components/debate/ParticipantSharedView.tsx` — update `getSubtopicItems()` to filter out items without `aiSummary`.

---

### 2. Main box + sidebar: Left/right alignment by speaker side

**Current**: All messages in `MessengerChat` (main box) and `TranscriptCard` (sidebar) stack uniformly with a left border.

**Change**:
- **`MessengerChat.tsx`**: Side 1 (sort_order 0) messages align left, side 2 messages align right. Use `flex justify-start` / `justify-end`, constrain bubble width to ~75%, and move the colored border to match (left for side 1, right for side 2).
- **`TranscriptCard.tsx`**: Same directional treatment — side 1 cards get `border-l`, side 2 cards get `border-r` and right-align text header.

**Files**: `src/components/debate/MessengerChat.tsx`, `src/components/debate/TranscriptCard.tsx`

---

### 3. Live transcription as subtitles over camera feed

**Current**: Interim transcription text (`interimText`) only appears at the bottom of the sidebar's current subtopic section.

**Change**: When any camera is on (local or remote), overlay the live `interimText` at the bottom of the camera feed as a subtitle bar — a semi-transparent dark strip with white text, positioned absolutely at the bottom of the video container.

**File**: `src/components/debate/ParticipantSharedView.tsx` — add a subtitle overlay inside the camera view sections (`onlyLocalOn`, `onlyRemoteOn`, `bothOn`). Also show the most recent final transcript line briefly before it fades, for continuity.

---

## Summary of File Changes

| File | Change |
|------|--------|
| `ParticipantSharedView.tsx` | Filter sidebar to AI-summarized items only; add subtitle overlay on camera feeds |
| `MessengerChat.tsx` | Left/right bubble alignment based on `sideOrder` |
| `TranscriptCard.tsx` | Left/right border + alignment based on `sideOrder` |

