Progress: [██████░░░░] (revised plan — Import as 4th creation format)

# Import-to-Record v2 — Promote to a Standalone Format

You're right. Folding import into the Debate flow has been forcing it through the wrong abstraction. Making it the **fourth creation format** (alongside Debate / Live / CMM) is cleaner: one entry point on the homepage wheel, one page, one record-structure picker, one pipeline.

## The new model

```text
Homepage wheel  →  Debate
                →  Live
                →  Change My Mind
                →  Import            ← NEW (4th slide)
```

**Import** = "I already have the raw material. Turn it into a record."

Inside the Import page, the user picks:

1. **Source** — URL · pasted text · file (.txt/.md/.srt/.vtt/.pdf/.mp3/.mp4/.m4a/.wav)
2. **Record structure** — Debate · Live · CMM (default = Debate)
3. **Title hint** (optional)

The output is always a **completed, private record** in the chosen structure. No live phase, no prep, no participants — just the final analyzed artifact.

## What this fixes

- **"Summaries pending"** — current import only writes `debate_transcripts.transcript_entries`. The threaded record reads from `round_summaries.key_arguments`. Import will now populate both, so the threaded record fills in immediately.
- **Audio / video / PDF "coming soon"** — Deepgram (already in the project for live) handles audio/video transcription; `unpdf` (already imported) handles PDFs. Same pipeline, three new front doors.
- **Confusing UX** — Right now Import is buried at the bottom of `/create` (Debate). Users don't realize Live and CMM imports aren't possible. Promoting it makes that capability obvious.

## Scope of this pass

### 1. Homepage wheel: add 4th slide
- `HeroActionShazam.tsx`: add `{ id: "import", label: "Import", description: "Turn a link, transcript, or recording into a record", icon: Download, route: "/create/import" }`.
- Wheel logic already cycles by count, so 4 slides Just Work; bump dot count.

### 2. New standalone page at `/create/import`
- Move out from under `/create` tab.
- Three source pickers (URL · text · file) — file picker accepts text, PDF, and media types.
- Record-structure segmented control: **Debate** (default) · **Live** · **Change My Mind**.
- Single "Generate record" button. Loader stages: `Transcribing → Structuring → Building threads → Summarizing`.

### 3. Edge function: `import-to-record` rewrite
- Accept `{ source, structure: "debate" | "live" | "cmm" }`.
- Branch on source:
  - text/url → existing path
  - PDF (URL or upload) → `unpdf` extract
  - audio/video (upload or direct media URL) → new `transcribe-media` helper using Deepgram prerecorded API
- Branch on structure when writing:
  - **debate** → subtopics + sides + transcript + **round_summaries** (this is the missing piece)
  - **live** → write `live_sessions` row + `session_entries` + subtopic baskets (matches Live Session schema)
  - **cmm** → write a CMM room shell + queue entries with the challenger texts
- Always private, always completed, always counts toward import daily cap.

### 4. Cost & limits
- Pro: 20 imports/day, media capped 60 min/file.
- Education/Civic: 50/day, 180 min/file.
- Reuse `logAiUsage` + add Deepgram minute logging to `usage_logs` (§18).

## Out of scope (follow-ups)

- YouTube URL ingestion (needs yt-dlp-style service — paste a direct media link or upload for now).
- Backfill button on already-imported debates to regenerate threaded summaries (easy one-shot if you want it after).
- Speaker diarization beyond Deepgram defaults.

## Files touched

- `src/components/home/HeroActionShazam.tsx` — add 4th slide
- `src/pages/ImportToRecordPage.tsx` — add structure picker, expand file types, restyle as standalone
- `src/pages/CreateDebatePage.tsx` — remove the "Import" dropbox (it's now its own wheel slide)
- `src/App.tsx` — route already exists at `/create/import`, keep it
- `supabase/functions/import-to-record/index.ts` — branch by source + structure, write `round_summaries`
- `supabase/functions/transcribe-media/index.ts` — new, Deepgram prerecorded wrapper
- Memory: add `mem://features/import-as-format` describing the new contract

No DB migrations needed — `round_summaries`, `live_sessions`, `session_entries`, and CMM tables all exist.

---

Approve and I'll ship it as one pass. If you'd rather split, the safest seam is: **(A) wheel slide + standalone page + summaries fix + text/PDF**, then **(B) audio/video via Deepgram** in a second pass — but they share enough code that doing both together is cheaper.
