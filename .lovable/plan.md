

# Live Conversation Tool

A new tool under the Create tab that records conversations, transcribes with speaker diarization, generates AI summaries on demand, and auto-identifies subtopics to organize the transcript.

## User Specifications

- **Persistence**: Saved to database
- **Speaker labels**: Auto-detected via Deepgram diarization (Speaker 1, Speaker 2, etc.)
- **Summaries**: On-demand button (can be pressed multiple times); auto-generated at end if never requested
- **Audio capture**: Both single-device (room mic) and multi-device (each on their own device)
- **Subtopics**: AI identifies and generates subtopics from the conversation; transcript entries are visually grouped under subtopic headers in the UI (like the debate sidebar)

## Database

### New table: `live_sessions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| created_by | uuid | references auth.users |
| title | text | nullable |
| mode | text | 'single_device' or 'multi_device' |
| status | text | 'recording' or 'ended' |
| transcript_entries | jsonb | entries with `speaker_id` + `subtopic` fields |
| summaries | jsonb | array of summaries generated at different points |
| subtopics | jsonb | array of AI-identified subtopic labels |
| created_at | timestamptz | |
| ended_at | timestamptz | nullable |

RLS: creator can CRUD their own sessions.

## File Changes

### 1. Migration SQL
- Create `live_sessions` table with RLS policies

### 2. `src/App.tsx`
- Add routes `/live/new` and `/live/:id` → `LiveSessionPage`

### 3. `src/pages/CreateDebatePage.tsx`
- Add a "Live" button below the prompt textarea that navigates to `/live/new`

### 4. `src/pages/LiveSessionPage.tsx` (new)
- **Setup screen**: Choose mode (single-device / multi-device), optional title
- **Recording screen**:
  - Mic toggle, live interim text display
  - Speaker-labeled transcript entries grouped under AI-generated subtopic headers
  - "Generate Summary" button (on-demand, repeatable)
  - Summary panel showing latest summary
  - "End Session" button (auto-generates summary if none were ever requested)
- **Post-session view**: Final transcript grouped by subtopics + all summaries

### 5. `src/hooks/useLiveTranscription.ts` (new)
- Fork of `useDeepgramTranscription.ts` adapted for Live mode:
  - Enable `diarize=true` in Deepgram WebSocket URL
  - Read `speaker` field from Deepgram results → label as Speaker 1, Speaker 2, etc.
  - Persist to `live_sessions` table
  - Expose `generateSummary()` as a callable function for on-demand use
  - When generating a summary, the AI also identifies/updates subtopics from the conversation so far; each transcript entry gets tagged with its subtopic

### 6. `supabase/functions/analyze-transcript/index.ts`
- Add a `mode` parameter. When `mode === 'live_conversation'`:
  - Use a conversation-focused prompt (not debate-style argument extraction)
  - Return a plain summary identifying speakers and key points
  - Also return an array of identified subtopics and map each transcript segment to a subtopic
  - This enables the UI to group entries under subtopic headers

## UI Layout (Recording Screen)

```text
┌──────────────────────────────────┐
│  Live: [title]            [End]  │
│──────────────────────────────────│
│  ── Topic: Budget Planning ──    │
│  Speaker 1: "We need to..."     │
│        Speaker 2: "I agree..."  │
│  ── Topic: Staffing ──          │
│  Speaker 1: "Hiring is..."      │
│        Speaker 3: "The team..." │
│                                  │
│  [interim text...]               │
│──────────────────────────────────│
│  🎤 Recording   [📝 Summary]   │
│──────────────────────────────────│
│  Summary Panel (collapsible)     │
│  Latest summary text here...     │
└──────────────────────────────────┘
```

Speaker alignment: odd speakers left, even speakers right (same pattern as debates).

