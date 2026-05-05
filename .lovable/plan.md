## 1. Unify Preview ↔ Post-Session Record layout

Build one shared component, `DebateRecordShell`, used by:
- `DebateScheduledPreviewPage` (scheduled, ghost rows)
- `DebateRoomPage` completed view (lines 1440–1608)
- `SpectatorPreviewShell` inside `DebateRoomPage` (live + scheduled spectator)

Shared layout (matches image 50, dark/clean — no big gradient hero block):
- Compact header: back, title, status pill, participant count, role pill, share button.
- One-line edit-window banner if applicable.
- Optional "View Your Performance" strip (participants only, completed).
- Sides shown as small inline chips under the title, NOT large cards.
- Subtopics rendered as the same `Collapsible` rows used in the completed view: numbered title + count badge + chevron, content fills with either real threads (live/completed) or `GhostStatementCard` (scheduled).
- "Debate Complete" / "Coming soon" footnote rendered the same way.
- `RecordCommentsSection` mounted under the threaded record (same in both states).
- `Interested?` / `Edit debate` sticky CTA preserved on preview.

`DebateRecordPreview.tsx` becomes a thin wrapper that delegates to `DebateRecordShell`, dropping the gradient hero + side cards. Cover image (if set) becomes a small thumbnail beside the title rather than a 16:9 banner.

## 2. Always-on debate-room tools

### A. Argument map: draggable + resizable everywhere, including prep

- Promote argument-map state from `ParticipantSharedView` up to `DebateRoomPage` so it persists across prep ↔ live transitions and is visible inside the prep overlay.
- Convert `FloatingOverlay` to support resize: add a bottom-right resize handle, persist `{x, y, w, h}` to sessionStorage. Min 280×220, max viewport-bound.
- Render the argument map mount at `DebateRoomPage` root (above prep overlay's z-index) so it's available during:
  - normal speaker turns (every speaker, not just publisher)
  - non-speakers' turns (give all speakers + facilitator the map button)
  - the prep phase (button stays visible in prep overlay header)
- Add tabs inside the argument-map bubble:
  - **Map** (existing `LiveArgumentMap`)
  - **Analysis** — replaces the old `round_summaries` surfacing. Shows per-subtopic AI analysis pulled from `round_summaries` (current data source) + the per-turn `ai_summary` already attached to transcript entries, grouped by subtopic. No new AI calls; this is just the new home for that data.

### B. Annotations: always-on, recorded to the notebook

Use `session_annotations` (already exists, used by live/CMM record + `consolidate-notebook` edge fn). Anchor by `record_type='debate'`, `record_id=<debateId>`. Highlight UX:
- New `DebateHighlightLayer` mounted over (a) the main window content (transcript bubbles, messenger chat, current-turn text) and (b) the argument-map overlay body. Selection → small floating "Annotate" pill → opens a tiny composer (excerpt + optional note) → inserts row.
- Available to all speakers any time the debate is live OR during prep phase (not just on their turn).
- Notebook overlay gains tabs: **Notes** (existing free-text textarea) and **Annotations** (list of saved annotations w/ excerpt + note, delete own).
- Post-debate: the existing live/CMM `AnnotationsTab` already renders these for `record_type='debate'`; surface a link in the completed view so users land in their study annotations.

### C. Notebook stays as before, but reachable for ALL speakers throughout (currently `isSpeaker` only — keep that gate, but remove "must be your turn" implicit gating).

## 3. Prep window: scope content to the prior turn only

Current `PrepPhaseOverlay` (incoming role) lists ALL transcripts and ALL summaries across every subtopic. Fix:

- Pass only the prior turn's content to `PrepPhaseOverlay`:
  - `lastTurnTranscript` (already done) and `lastTurnSummary` for the outgoing speaker (the turn that just ended).
  - For incoming: show ONLY the same prior-turn transcript + summary (the immediately preceding turn from the other side), NOT the full debate history.
- Replace the 3-column "Transcripts / Summaries / My Notes" with a 2-column "Prior turn (transcript + summary) / My Notes" for incoming. Match the simpler outgoing layout.
- The argument-map button (always-on per §2) is the canonical way to access full history during prep.
- Compute prior-turn entries in `DebateRoomPage` from `transcriptEntries` filtered to `subtopic === currentSubtopic` AND `speaker_side === outgoingSideLabel` AND most recent — already partly there, just stop forwarding `allTranscriptEntries` to the overlay.

## Files

**New**
- `src/components/debate/DebateRecordShell.tsx`
- `src/components/debate/DebateHighlightLayer.tsx`
- `src/components/debate/ArgumentMapAnalysisTab.tsx`
- `src/hooks/useDebateAnnotations.ts` (thin wrapper around `session_annotations` for `record_type='debate'`)

**Edit**
- `src/components/debate/FloatingOverlay.tsx` — add resize handle + persist size
- `src/components/debate/ArgumentMapOverlay.tsx` — add Map/Analysis tabs
- `src/components/debate/NotebookOverlay.tsx` — add Notes/Annotations tabs
- `src/components/debate/PrepPhaseOverlay.tsx` — scope to prior turn only; mount argument-map button in header
- `src/components/debate/ParticipantSharedView.tsx` — show map/notebook buttons for all speakers (not just publisher path); lift map state up
- `src/pages/DebateRoomPage.tsx` — root-level argument map + highlight layer; pass scoped prep data; replace completed-view JSX with `DebateRecordShell`
- `src/pages/DebateScheduledPreviewPage.tsx` — render `DebateRecordShell` instead of `DebateRecordPreview`'s gradient hero
- `src/components/debate/DebateRecordPreview.tsx` — slim down to delegate to shell (or remove)

**No DB migration required** — `session_annotations` already supports `record_type='debate'`/`record_id`. No new tables.

## Open question

Confirm the annotation approach (`session_annotations`) before I implement, or say "go" and I'll proceed with the plan as written.