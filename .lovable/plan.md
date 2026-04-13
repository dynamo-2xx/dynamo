

# Record Q&A Chat Feature

Add a floating chat button (smiley-face logo) at the bottom of every session record that expands into a multi-turn AI chat. The AI answers questions sourced from the transcript/summaries and provides hotlinks to the relevant sections.

## Changes

### 1. New edge function: `supabase/functions/record-qa/index.ts`
- Accepts `{ sessionId, messages }` where messages is the multi-turn conversation history.
- Fetches the live session's `transcript_entries`, `summaries`, and `subtopics` from the database.
- Constructs a system prompt instructing the AI to answer only from the transcript data and to cite sources using a structured format (e.g., `[Topic: "Topic Name"]` or `[Entry: "speaker text snippet"]`).
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with the transcript as context + conversation history.
- Returns the AI response (non-streaming, via `supabase.functions.invoke`).
- For shared sessions: validates that the session has a `share_token` (no auth required for those). For owned sessions: validates auth.
- Handles 429/402 errors.

### 2. New component: `src/components/live/RecordQAChat.tsx`
- A floating button in the bottom-right corner using the smiley-face logo (`@/assets/logo-smiley.png`).
- On click, expands into a chat panel (fixed position, ~400px tall) with:
  - Message history rendered with `react-markdown` for AI responses.
  - AI citations formatted as clickable links that open the referenced topic section in a dialog/sheet.
  - Input field + send button at the bottom.
- Multi-turn: stores `messages[]` in local state, sends full history to the edge function each call.
- Loading state while waiting for AI response.
- Close button to collapse back to the smiley icon.

### 3. Citation modal: `src/components/live/CitationModal.tsx`
- A dialog/sheet that opens when a user clicks a hotlink in an AI answer.
- Receives the topic name or entry ID and displays the matching subtopic section with its transcript cards (reusing existing `TranscriptCard` + `groupConsecutiveEntries`).
- Shows speaker names and summaries in context.

### 4. Update `src/components/live/SessionRecordView.tsx`
- Import and render `<RecordQAChat>` at the bottom of the component, passing `sessionId`, `transcriptEntries`, `subtopics`, `summaries`, `speakerNames`, and `readOnly` status.

### No logic changes
- No changes to transcription, summarization, routing, auth flows, or Supabase queries.
- The edge function is new and self-contained.

