

# Bring Record + Study tools to Debates and Change My Mind

Today: notebook (Thoughts / My Take / Annotations / Dynamo Q&A) + My Study only work on Live Sessions. After this: same toolset works on Debates and CMM, mounted live and in the archive, with full annotation parity.

## Behavior

- **Notebook is available live AND after** for Debates and CMM (matches Live Sessions). Mobile: bottom sheet. Desktop: side panel.
- **Annotations match Live exactly** — highlight any transcript text, attach a note, jump back to source.
- **My Study** lists every notebook regardless of format with a small chip (`Live` / `Debate` / `CMM`).
- **Dynamo Q&A** for Debates and CMM reads only from `arguments` (the canonical published statements).

## Database (one migration)

1. Add to `session_notebooks` and `session_annotations`:
   - `record_type text not null default 'live_session'` (`'live_session' | 'debate' | 'change_my_mind'`)
   - `record_id uuid` — backfilled from `session_id`, then set `not null`
2. Drop FK on `session_id → live_sessions.id` (keep column nullable as legacy mirror; remove in a follow-up).
3. New unique index `(record_type, record_id, user_id)` on `session_notebooks`.
4. New SECURITY DEFINER helper `can_view_record(_type text, _id uuid)` that dispatches to `can_view_live_session` or `can_view_debate`.
5. Update RLS on both tables: owner full access; published rows readable when `can_view_record(record_type, record_id)`.
6. Update `get_shared_notebook` / `get_shared_notebook_for_reader` to LEFT JOIN both `live_sessions` and `debates` based on `record_type` for `session_title`.

## Annotation anchoring (Debates/CMM)

- `node_kind = 'argument'` → `node_id = arguments.id` (typed/published statements)
- `node_kind = 'transcript'` → `node_id = ` per-entry id from `debate_transcripts.transcript_entries[].id` (spoken)
- `char_start` / `char_end` already exist — used same as Live.

## Hooks

- Generalize:
  - `useSessionNotebook` → `useRecordNotebook({ recordType, recordId })`. Thin `useSessionNotebook(sessionId)` wrapper retained for existing Live call sites.
  - `useSessionAnnotations` → `useRecordAnnotations({ recordType, recordId })`.
  - `useRecordQA(sessionId)` → `useRecordQA({ recordType, recordId })`.
- `useMyStudy`: fetch all user notebooks, hydrate titles by `record_type` from `live_sessions` or `debates`, expose `recordType` on each card.

## UI integration

- **`DebatePreviewPage.tsx`** — mount `NotebookPanel` with `recordType: 'debate'`, available live and in archive. Highlight layer attaches to argument cards and transcript bubbles using new node ids.
- **`ChangeMyMindRoomPage.tsx`** — same panel, `recordType: 'change_my_mind'`. Available throughout.
- **`NotebookPanel.tsx`** — accepts `{ recordType, recordId }`; internal hook calls swapped for generalized hooks.
- **`MyStudyPage` / `NotebookCard`** — render small chip (Live/Debate/CMM); cards link to `/live/:id`, `/debate/:id`, or `/cmm/:id` via `recordType`.
- **`MyStudyDetailPage`** — format-aware render: title source + back-link route depend on `recordType`.

## Edge functions

- **`record-qa`** — accept `recordType` + `recordId`. For `debate` / `change_my_mind`, build context from `arguments` (ordered by `subtopic.sort_order`, then `created_at`). For `live_session`, unchanged.
- **`consolidate-notebook`** — read notebook by `(record_type, record_id, user_id)`; same prompt and output.

## Backfill + safety

- Migration sets `record_id = session_id`, `record_type = 'live_session'` for all existing rows.
- Existing share tokens keep working (lookup is on the notebook row).
- Old `(session_id, user_id)` upserts redirected to new key in client + edge functions.

## Files

- New migration (schema + RLS + helper + RPC updates)
- Edit: `useSessionNotebook.ts`, `useSessionAnnotations.ts`, `useRecordQA.ts`, `useMyStudy.ts`
- Edit: `NotebookPanel.tsx`, `HighlightAnnotateLayer.tsx` (accept generalized props), `MyStudyDetailPage.tsx`, `NotebookCard.tsx`
- Edit: `DebatePreviewPage.tsx`, `ChangeMyMindRoomPage.tsx` (mount panel)
- Edit: `supabase/functions/record-qa/index.ts`, `supabase/functions/consolidate-notebook/index.ts`

## Out of scope

- Reader-notes inbox for debates (Live-only for now — follow-up).
- Removing the legacy `session_id` column (kept one release for safety).
- Subscription/limit changes.

