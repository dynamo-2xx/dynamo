## Goal

Stop forcing imports through Debate / CMM / Live formats. Imports become their own record type with a dedicated viewer: **Transcript** + **Argument Map** as the two primary tabs, plus Q&A chat, sharing/comments, and the notebook stack — nothing else (no sides, prep, turns, queue, facilitator).

## What changes

### 1. New `imported_records` table

Single home for imports. No legacy debate fields, no participants, no RLS coupling to `debates`.

Columns: `id`, `user_id`, `title`, `description`, `cover_image_url`, `source_kind` (`url`/`text`/`pdf`/`media`/`article`), `source_url`, `subtopics jsonb`, `transcript_entries jsonb`, `argument_map jsonb` (claims/counters/evidence with `parent_index` chains), `is_public`, `share_token`, `created_at`, `updated_at`.

RLS via new `can_view_imported_record(_id uuid)` SECURITY DEFINER (public / owner / `is_follower_of(user_id)` / `is_record_viewer('imported_record', id)`). Add `'imported_record'` to the `shareable_record_type` enum so existing share/comment/notebook plumbing applies for free.

### 2. Rewrite the edge function

`supabase/functions/import-to-record/index.ts`:

- Drop the `structure: debate|live|cmm` switch and the debate/live/cmm insert branches.
- One AI pass returns: `{ topic, subtopics[], transcript[], argument_map[] }` (no sides, no challengers, no key_arguments-by-side).
- Insert a single row into `imported_records`. Return `{ imported_record_id }`.
- Keep: tier gate, daily soft cap (now counted off `imported_records`), Deepgram for media, PDF extract, URL fetch, usage logging.

### 3. New viewer page `/import/:id` → `ImportedRecordPage.tsx`

Two-tab layout reusing the existing `ArgumentMapContent` component (already supports `threaded` / `transcript` tabs):

```text
┌──────────────────────────────────────────────┐
│  ← Back   Title           [Share] [⋯]        │
│  Imported · source chip · date · privacy     │
├──────────────────────────────────────────────┤
│  [ Transcript ] [ Argument Map ]             │
├──────────────────────────────────────────────┤
│  <ArgumentMapContent tab={tab} ... />        │
└──────────────────────────────────────────────┘
   Floating: Dynamo Q&A · Notebook drawer
   Bottom:   RecordCommentsSection
```

Reused components: `ArgumentMapContent`, `ShareDialog`, `RecordCommentsSection`, `useSessionNotebook`, `useRecordQA`, `CitationModal`. All accept a `(record_type, record_id)` pair — we just pass `'imported_record'`.

### 4. Strip the structure picker from `ImportToRecordPage.tsx`

- Remove the Debate / Live / CMM tri-toggle and `structure` state.
- Single CTA: **Generate record**.
- On success, navigate to `/import/:id`.

### 5. Migrate existing imports

Migration script inside the same SQL migration:

- For every `debates` row where `imported_source_kind IS NOT NULL`: insert into `imported_records` copying topic→title, description, `imported_source_kind`→source_kind, `imported_source_url`→source_url, subtopics + transcript_entries reconstructed from `debate_subtopics` + `debate_transcripts.transcript_entries` + `round_summaries.key_arguments`.
- For every `live_sessions` row that was imported (heuristic: `mode='single_device' AND status='ended' AND created via import` — flagged by adding `imported_from boolean` check; if no flag exists we'll mark candidates via the structuring metadata). Pragmatic fallback: only migrate `debates`-side imports cleanly; live imports will be small in number and the user can re-import if needed. (Flag in the plan to confirm.)
- After copy, soft-redirect: add a route handler on the old detail pages that, if the record has `imported_source_kind`, `Navigate` to `/import/:newId` via a lookup table written during migration (`legacy_import_redirects(old_type, old_id, new_id)`).

### 6. Cleanup

- Remove `imported_source_kind` / `imported_source_url` reads from debate UI (or keep silent — they'll only exist on legacy rows that are now redirected).
- Update `HeroActionShazam` link target stays `/create/import`.
- Update memory file `.lovable/memory/features/import-to-record.md` to reflect new flow.

## Out of scope

- YouTube URL ingestion (still returns the existing 501 message).
- Re-extracting argument maps for legacy imports — they get migrated with whatever shape they already had; new imports use the cleaner argument_map schema.
- Editing the imported transcript or argument map post-creation.

## Open item to confirm

Live-session imports: migrate best-effort, or skip and leave them at `/live/:id` until re-imported? I'll default to **skip + leave** unless you say otherwise — the debate-side imports are the bulk and worth the migration cost. My answer: remove all previous imported files. Delete them all. We're starting from scratch. Change nothing else.

&nbsp;