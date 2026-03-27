

# 3-Column Incoming Prep Workspace + Debate Notebook

## What gets built

Two connected features in one pass:

1. **Incoming prep workspace** — after selecting prep time, the incoming user sees a 3-column layout: all previous transcripts | all summaries (with "Editing..." status) | scratch notes
2. **Notebook button in debate room** — a persistent button during live debate that opens a Sheet with the same scratch notes textarea

The notes textarea in prep and the notebook share the same state, so anything written during prep carries into the debate and vice versa.

## File changes

### `src/components/debate/PrepPhaseOverlay.tsx`

**New props:**
- `allTranscriptEntries` — full array of transcript entries from the debate
- `subtopics` — array of `{ id, title }` for grouping
- `sides` — array of `{ id, label }` for speaker labels
- `isSummaryBeingEdited?: boolean` — true while outgoing side hasn't finished editing
- `notebookValue?: string` and `onNotebookChange?: (val: string) => void` — shared ephemeral notes state

**Incoming countdown section** (lines 149-167) — replace simple timer with:
- Widen container to `max-w-6xl`
- Timer centered above a 3-column grid (`grid-cols-1 md:grid-cols-3 gap-4`)
- **Column 1 — Transcripts**: group `allTranscriptEntries` by subtopic, show speaker label + text, scrollable `max-h-[55vh]`
- **Column 2 — Summaries**: show AI summaries per entry grouped by subtopic; if `isSummaryBeingEdited`, latest summary shows a pulsing "Editing..." badge that auto-replaces when summary prop updates
- **Column 3 — My Notes**: `<textarea>` bound to `notebookValue`/`onNotebookChange` (or local fallback state)
- Ready button below grid

**Outgoing section** — update notes textarea in the prep phase to also use `notebookValue`/`onNotebookChange` if provided (for notebook continuity)

### `src/pages/DebateRoomPage.tsx`

**New state:**
- `notebookContent: string` — `useState("")`
- `notebookOpen: boolean` — `useState(false)`

**New imports:** `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from ui/sheet; `NotebookPen` from lucide-react

**Pass new props to PrepPhaseOverlay:**
- `allTranscriptEntries={transcriptEntries}`
- `subtopics={subtopics}`
- `sides={sides}`
- `isSummaryBeingEdited` — derived from whether the other side's prep ready flag is false
- `notebookValue={notebookContent}` and `onNotebookChange={setNotebookContent}`

**Notebook button:** Add a small fixed-position `NotebookPen` icon button (bottom-right area, near controls) visible to speakers during live debate. Clicking toggles `notebookOpen`.

**Notebook Sheet:** Render a `<Sheet>` (side="right") containing a textarea bound to `notebookContent`. Header says "My Notes". Notes are ephemeral — no DB persistence.

## Layout sketch — incoming prep (after time selection)

```text
┌───────────────────────────────────────────────────────┐
│            Preparation Time       1:30                │
├──────────────────┬──────────────────┬─────────────────┤
│  TRANSCRIPTS     │  SUMMARIES       │  MY NOTES       │
│                  │                  │                  │
│  [Subtopic 1]    │  [Subtopic 1]    │  [textarea]     │
│  SpeakerA: ...   │  Summary: ...    │                  │
│  SpeakerB: ...   │                  │                  │
│                  │  [Subtopic 2]    │                  │
│  [Subtopic 2]    │  ⏳ Editing...   │                  │
│  SpeakerA: ...   │                  │                  │
│                  │                  │                  │
│  (scrollable)    │  (scrollable)    │  (grows w/input) │
├──────────────────┴──────────────────┴─────────────────┤
│                   [ I'm Ready ]                       │
└───────────────────────────────────────────────────────┘
```

## Notes
- All notes are ephemeral (local state only), lost on page refresh
- No new DB columns or migrations needed
- `isSummaryBeingEdited` uses existing `prep_sideX_ready` flags already synced via realtime
- On mobile, columns stack vertically

