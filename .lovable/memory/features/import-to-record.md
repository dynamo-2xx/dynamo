---
name: Import-to-Record (second dropbox on /create)
description: Second dropbox on /create ingests YouTube/file/PDF/URL into a fully threaded record identical to any other completed Debate
type: feature
---

# §25 — Import-to-Record

Two inputs on `/create`:
1. **Existing prompt textbox** → also accepts drag-and-drop files (images, PDFs, audio, video) and pasted URLs as **context** for template generation.
2. **NEW second dropbox below**, labeled **"Already have a debate? Drop it here."** → does NOT generate a template. **Ingests** the source and produces a complete threaded *record* (transcript + argument map + threads), identical in shape and behavior to any other completed Debate record.

## Accepted sources at launch (all four)
- YouTube / video URLs (server-side fetch → Deepgram)
- Audio/video uploads (mp3/mp4/wav/m4a)
- PDF / DOCX transcripts (text extraction → AI threading)
- Plain web article URLs (Firecrawl scrape → AI structures into debate threads)

## Flow
1. User drops file / pastes link → Enter or Create.
2. Full-screen **"People to the Power!"** loader (DYNAMO splash variant) for entire processing duration. Stages: *Fetching → Transcribing → Structuring → Building threads*.
3. Redirect to new record, presented identically to any completed Debate (transcript, argument map, Q&A, notebook, comments, sharing, Continue button — all enabled).

## Ownership & defaults
- **Private by default**, toggleable to public anytime.
- Counted as standard Debate against tier quota (§12).
- Small `Imported` chip + source attribution (URL/filename) shown in record header metadata.

## Cost controls (§18)
- Per-user monthly import-minute caps: Free 0 / Pro 120 / Edu, Civic TBD.
- File size cap ~500 MB, duration cap ~3 h, enforced server-side.
- Deepgram + AI costs logged to `ai_usage_log` with `function_name='import_to_record'`.

## Edge function
New `supabase/functions/import-to-record/index.ts` orchestrates fetch → transcribe → structure → persist. Reuse `analyze-transcript` for threading.
