

# Live Session: Complete Feature Plan

## Scope

Building on the existing Live session infrastructure, this plan adds:

1. **Speaker accuracy improvements** — audio energy gate, uncertain entry marking
2. **Speaker renaming** — users assign real names to generic speaker labels
3. **Post-session record page** — full transcript + summaries + speaker correction tools
4. **Auto-summary on end** — always generate a final summary when session ends
5. **"Live" tab in My Agenda** — browse past sessions
6. **Sharing** — generate a share link for completed records

## Architecture

```text
┌─────────────────────────────────────────┐
│ My Agenda (MyDebatesPage)               │
│ [Debates] [Drafts] [Live]              │
│                                         │
│  Session Title       Mar 26  ● Ended   │
│  Team Standup        Mar 25  ● Ended   │
└─────────────────────────────────────────┘
         │ click
         ▼
┌─────────────────────────────────────────┐
│ Post-Session Record (/live/:id)         │
│                                         │
│  Title · Date · Duration                │
│  [Share] [Back to My Agenda]            │
│                                         │
│  ── Summaries ──                        │
│  Summary cards with subtopic tags       │
│                                         │
│  ── Transcript ──                       │
│  Grouped by subtopic                    │
│  Speaker bubbles (tap to edit/split/    │
│  merge) with rename capability          │
└─────────────────────────────────────────┘
```

## Detailed Changes

### 1. Database Migration

Add a `share_token` column to `live_sessions` and an RLS policy for public viewing by token:

```sql
ALTER TABLE public.live_sessions 
  ADD COLUMN share_token text UNIQUE DEFAULT NULL,
  ADD COLUMN speaker_names jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Allow anyone to view a session via share token
CREATE POLICY "Anyone can view shared live sessions"
  ON public.live_sessions FOR SELECT TO anon
  USING (share_token IS NOT NULL);
```

`speaker_names` stores a map like `{"0": "Alex", "1": "Jordan"}` so renamed labels persist.

### 2. `useLiveTranscription.ts` — Audio energy gate

Add RMS check before sending PCM frames to Deepgram. Only send when energy exceeds threshold (~0.01). Mark entries as `uncertain: true` when word-level speaker data is missing.

On session end (`endSession`), auto-generate a summary by calling `generateSummary()` before updating status to "ended".

### 3. `LiveSessionPage.tsx` — Post-session record page

When `phase === "ended"`, replace the current minimal view with a full record page:
- **Header**: title, date, duration, share button, "Back to My Agenda" link
- **Summaries section**: all summary cards with subtopic tags
- **Transcript section**: grouped by subtopic, left/right speaker bubbles
- **Speaker correction tools**:
  - Tap speaker label to rename (updates `speaker_names` in DB)
  - Split button to divide a bubble at a word boundary
  - Merge button to combine adjacent uncertain entries
- **Share button**: generates a `share_token`, copies link to clipboard

### 4. `MyDebatesPage.tsx` — Add "Live" tab

Add a third tab that queries `live_sessions` where `created_by = user.id`, ordered by `created_at desc`. Cards show title, date, status badge. Click navigates to `/live/:id`.

### 5. Sharing route

Add a public route `/live/shared/:token` that loads a read-only version of the record page using the share token (no auth required).

## File Changes

| File | Change |
|------|--------|
| Migration SQL | Add `share_token`, `speaker_names` columns + anon SELECT policy |
| `src/hooks/useLiveTranscription.ts` | Audio energy gate; uncertain marking; auto-summary on end |
| `src/pages/LiveSessionPage.tsx` | Full post-session record page with rename, split, merge, share |
| `src/pages/MyDebatesPage.tsx` | Add "Live" tab querying `live_sessions` |
| `src/App.tsx` | Add `/live/shared/:token` route |

