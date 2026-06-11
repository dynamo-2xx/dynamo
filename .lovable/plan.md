# P1 Polish — Complete ✅

- #4 1hr cap + clock button — done
- #5 Analysis progress bar — done (`AnalysisProgress.tsx` mounted in all 4 record pages via `belowBack`)
- #6 Time-anchored mm:ss left rail with iOS liquid-glass chip — done in `ArgumentMapContent` transcript tab
- #7 Avatar + display name on every transcript bubble — done (speakerMeta map piped from each page; live uses `useLiveParticipants`)

Next: P2 — retire mic lobby, replace with in-room mic-button voice-confirm (see prior plan body).

All three land in the shared `ArgumentMapContent` transcript renderer so debate / live / imported records get them for free.

---

## #5 — Analysis progress bar

New `<AnalysisProgress />` rendered in `RecordShell`'s `belowBack` slot on every ended record. Two segments:

- **Live insights** — green when any `transcriptEntries[].ai_summary` is populated. (Live's `analyze-transcript` writes these inline; for debate/imported, segment shows green immediately if entries already carry summaries, otherwise indeterminate while pending.)
- **Deep analysis** — green when `useArgumentUnits(sessionId, sessionKind)` returns any row with `pass_kind === "structure_final"`. Indeterminate (animated shimmer) while empty.

Polls / re-subscribes every 5s via the existing `useArgumentUnits` realtime channel; hides itself once both segments are green. Uses the shadcn `Progress` primitive split into two halves with a thin gap, monochrome (black fills, neutral track) per branding.

New file: `src/components/record/AnalysisProgress.tsx`. Each of the three pages (`LiveEndedRecord`, `SharedLiveBody`, `ImportedRecordPage`, `DebateRoomPage`) passes it via `belowBack`.

---

## #6 — Time-anchored transcript bubbles (iOS liquid glass)

Edit `src/components/debate/ArgumentMapContent.tsx` transcript render block (lines 436–445):

- Convert each entry row into a two-column flex: left rail (fixed `w-12`, top-aligned `mm:ss` chip) + right column (existing bubble).
- mm:ss derived from `entry.timestamp - sessionStartMs`. New optional `sessionStartMs` prop on `ArgumentMapContent` / `RecordShell`; each page passes it (`new Date(createdAt).getTime()` for live/imported, debate's existing `started_at`).
- Chip styling = iOS liquid glass: `backdrop-blur-xl bg-white/40 dark:bg-white/5 border border-white/40 ring-1 ring-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-body text-foreground/80`. Sticks to top of its row, top-aligned with the speaker label.
- Format: `m:ss` under 1h, `h:mm:ss` ≥ 1h. Negative / NaN diffs render blank (handles edge cases gracefully).

---

## #7 — Avatar + display name on every bubble

Approach: pass a single optional `speakerMeta` map down to `ArgumentMapContent`, keyed by the same string used as `speaker_side`. Each page builds it from what it knows:

```ts
type SpeakerMeta = {
  name?: string;
  avatarUrl?: string | null;
  userId?: string | null;
};
type SpeakerMetaMap = Record<string, SpeakerMeta>;
```

- **Live / Shared-live** — build from `useLiveParticipants`: `{ [pill.name]: { name, avatarUrl, userId } }`. Since `speaker_side` is already resolved to `pill.name` in the transcript inputs, lookup is direct.
- **Debate** — build from `participants[]`: `{ [side_label]: { name: displayName, avatarUrl, userId } }`.
- **Imported** — leave empty; falls through to existing initials behavior.

Renderer change in `ArgumentMapContent.tsx:436–445`:

- Replace the `<p>{e.speaker_side}</p>` uppercase label with a row: small avatar (20px) + display name. If `speakerMeta[e.speaker_side]?.avatarUrl` present → `<Avatar>` with image; otherwise fallback to initials avatar built from `speaker_side`. Wrap in `<Link to={/u/${userId}}>` when `userId` is present, else plain span.
- Keep `data-annotatable` on text body unchanged so notes still work.

---

## Files

- New: `src/components/record/AnalysisProgress.tsx`
- Edit: `src/components/debate/ArgumentMapContent.tsx` (transcript render block, add `sessionStartMs` + `speakerMeta` props)
- Edit: `src/components/record/RecordShell.tsx` (forward new props, expose `belowBack` already exists)
- Edit: `src/pages/LiveSessionPage.tsx` (`LiveEndedRecord` — build `speakerMeta` from pills, pass `sessionStartMs`, mount `AnalysisProgress`)
- Edit: `src/pages/SharedLiveSessionPage.tsx` (same)
- Edit: `src/pages/ImportedRecordPage.tsx` (pass `sessionStartMs = created_at`, mount `AnalysisProgress`)
- Edit: `src/pages/DebateRoomPage.tsx` (build `speakerMeta` from participants, pass `started_at`, mount `AnalysisProgress`)
- Update `.lovable/plan.md` to mark P1 complete.

## Out of scope

- New columns (no `deep_perf_done_at` needed — argument_units row presence is the signal). Why not include this in plan? If you can, do so. I don't understand why this is out of scope.
- Reworking the in-session live SpeakerBubble path (`TranscriptPane`); this is record-tab only. Why not include this in plan? If you can, do so. I don't understand why this is out of scope.
- Voice-confirm / diarization (P2).