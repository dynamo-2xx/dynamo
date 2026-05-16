## Goal

Capture the final two pre-build features as memory entries only. **No code or DB changes in this pass** — just memory files. Build phase begins right after approval.

---

## §24 — "Continue" button on completed records

New memory file: `mem://features/continue-records`

**Rule**: Available on completed Debate, CMM, and Live records. **Never on Notebooks** (always editable). Owner-only trigger at v1 (co-owners propose via existing §23 flow).

**Per-format behavior**
- **Live** → opens a brand-new Live session, marked as a continuation. New transcript entries are appended *into the same record view* below a divider (see Threading).
- **Debate / CMM** → clones the original template (topic, subtopics, sides, settings, cover, tags) into a new record; original stays immutable.

**Scope prompt (modal on click)**: "Bring participants from previous session?" → Yes (auto re-invite original speakers/invitees) / No (empty, owner only). User decision per-click.

**Linkage model**: Linear chain only. Each continuation stores `continued_from_id` + `continuation_index` (v1, v2, v3…). No branching/tree at launch.

**Threaded record UI**
- Divider row in transcript: thin black line + chip `"Continuation 2 · May 16, 2026 · 14:32"`.
- Every transcript entry shows a small `v1` / `v2` badge in the speaker row.
- Header chip: `"Continuation 2 of 3 →"` linking to next/prev in chain.
- Argument Map, Q&A, comments operate over the full merged chain by default; toggle to scope to one version.

**Data model (for build phase)**
- Add `continued_from_id uuid`, `continuation_index int default 1`, `continuation_root_id uuid` to `debates` and `live_sessions`.
- For Live: entries stay in same `live_session_entries` table keyed by `session_id`; divider is a synthetic row derived from `live_sessions.continuation_started_at` events array — OR new `session_id` per continuation joined via root.  **Decide at build time**; memory locks the user-facing behavior, not the storage shape.

**Tier limits**: each Continue consumes one record from the user's monthly quota (§12). No special discount.

---

## §25 — Import-to-Record (second dropbox on `/create`)

New memory file: `mem://features/import-to-record`

**Two inputs on the Debate generator page** (`/create`):
1. **Existing prompt textbox** → now also accepts drag-and-drop of files (images, PDFs, audio, video) and pasted URLs. Used as additional *context* for template generation.
2. **NEW second dropbox below** labeled **"Already have a debate? Drop it here."** This does NOT generate a template — it **ingests** the source and produces a complete, threaded *record* (transcript + argument map + threads), identical in shape and behavior to any other completed record.

**Accepted sources at launch** (all four):
- YouTube / video URLs (yt-dlp-style fetch in edge function, then Deepgram)
- Audio/video file uploads (mp3/mp4/wav/m4a, capped)
- PDF / DOCX transcripts (text extraction → AI threading)
- Plain web article URLs (scrape → AI structures into debate threads)

**Flow**
1. User drops file / pastes link → presses Enter or Create.
2. Full-screen **"People to the Power!"** loader (DYNAMO splash variant) shown for entire processing duration. Progress text reflects current stage: *Fetching → Transcribing → Structuring → Building threads*.
3. On finish → redirect to the new record, presented identically to any completed Debate (transcript, argument map, Q&A, notebook, comments, sharing, Continue button — all enabled).

**Ownership & defaults**
- **Private by default**, toggleable to public anytime.
- Counted as a standard Debate against the user's tier quota (§12).
- Imported records carry a small `Imported` chip + source attribution (URL / filename) in metadata, visible on the record header.

**Cost controls (§18)**
- Hard per-user monthly cap on import minutes (Free: 0, Pro: 120 min, Edu/Civic: TBD).
- Deepgram + AI costs logged to `ai_usage_log` with `function_name='import_to_record'`.
- File size cap (e.g. 500 MB) and duration cap (e.g. 3 h) enforced server-side.

**Edge function**: new `import-to-record/index.ts` orchestrates fetch → transcribe → structure → persist. Existing `analyze-transcript` reused for threading.

---

## Deliverable for this plan

1. Create `.lovable/memory/features/continue-records.md` with the §24 spec above.
2. Create `.lovable/memory/features/import-to-record.md` with the §25 spec above.
3. Update `.lovable/memory/index.md` Memories list to reference both.

No source code, DB migration, or edge function work in this pass. After approval, the next user message starts the build phase across all §23 / §24 / §25 features.
