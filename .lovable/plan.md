# Argument Map Redesign — Two Analyses, Two Displays

## The mental model

"Argument map" = a dual surface with two tabs that share nothing analytically:


| Tab                 | Source                                               | Analysis pass                                  | Purpose                                 |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| **Transcript**      | Pure speaker turns, grouped only by subtopic         | Rhetorical/logical (existing perf annotations) | "How well did I speak?"                 |
| **Threaded Record** | AI-assembled argument units, threaded by proposition | Structural (new: anatomy + relationship tags)  | "How did the discussion actually move?" |


Today the threaded record and transcript are tangled — transcript is fragmented into "threads" and the threaded record uses a thin claim/counter/support/quote/stake type system that doesn't represent real argumentation. This redesign separates them and makes the threaded record honest about the structure of a conversation.

Applies everywhere "argument map" appears: imported records, debate room overlay, debate archive, live session record.

---

## Part A — Transcript tab (simplify)

Strip threading. Render the transcript exactly as spoken, grouped only by subtopic.

- One collapsible per subtopic, in order.
- Inside each subtopic: chronological speaker turns. Each turn shows speaker/side, optional timestamp, and the unedited text.
- Rhetorical/logical analysis (existing `performance_annotations`, `pass_kind = 'rhetoric'`-ish) overlays as inline insight pills on the text — same `<InsightText>` mechanism already wired.
- No claim/support/counter chips. No parent/child indenting. No round summary.

This is what `tab === "transcript"` becomes — a clean reading view.

---

## Part B — Threaded Record tab (rebuild)

A two-layer structural product:

### B1. Argument unit anatomy (per card)

Each argument unit card renders its internal parts as labeled inline spans:

```
ARGUMENT
├ CLAIM          — required, exactly one
├ GROUNDS        — evidence/data; quotes nested with left-border indent
├ WARRANT        — logical bridge; if absent → subtle gray "warrant: absent" note
├ QUALIFIER      — hedge; if absent on a strong claim → subtle gray note
├ CONCESSION     — speaker's own acknowledgment of limits
└ REBUTTAL       — pushback on opposing argument
```

A standalone CONCESSION turn (no attached claim) renders as a peer card with a slightly inset style (yield, not advance).

### B2. Relationship tags (between cards)

Neutral gray connector label between consecutive cards in a thread, taxonomy:

`ANCHOR · SUPPORT · CHALLENGE · COUNTER · EXTENSION · CONCESSION · REFRAME · QUALIFICATION · SYNTHESIS · PIVOT · UNRESOLVED`

Rules:

- First unit of every thread = `ANCHOR`.
- Exactly one tag per non-anchor unit.
- Connectors are **neutral gray, never color-coded** (color is reserved for the rhetorical analysis).
- Hover/tap a connector → expands to show the one-sentence `note`.
- `UNRESOLVED` is post-session only.

### B3. Hierarchy

`Topic → Subtopic → Threads → Argument Units (anatomy spans)` — all levels collapsible. Thread summary stays at the bottom of each thread.

---

## Part C — Backend: two new analysis passes

### Tables (one new, one columns added)

`**argument_units**` (new) — replaces the role currently played by `arguments` rows on the threaded tab. Keep `arguments` table untouched for now (live-debate authoring still uses it); the post-session structural pass writes into `argument_units`.

```
session_id, session_kind ('debate'|'cmm'|'live'|'imported')
subtopic_id (nullable), subtopic_title
thread_id (uuid, groups units within a thread)
speaker_label, speaker_side, turn_index
source_text (the raw passage this unit was assembled from)
anatomy jsonb           -- [{part, text, note}]
relationship_tag text   -- enum
relates_to uuid         -- argument_unit id, null for ANCHOR
relationship_note text
is_standalone_concession bool
created_at
```

RLS: SELECT gated via `can_view_debate` / `can_view_imported_record` mirroring `performance_annotations`. INSERT denied to clients (edge functions only). GRANTs to authenticated + service_role.

### Edge functions

1. `**analyze-structure**` (new) — given a session's transcript:
  - Step 1: chunk transcript into argument units (one per coherent move).
  - Step 2: run **anatomy parsing prompt** per unit (Toulmin parse → `anatomy` jsonb).
  - Step 3: assign threads by shared proposition (lightweight clustering by anchor claim).
  - Step 4: run **relationship tagging prompt** per non-anchor unit within its thread.
  - Delete-then-insert into `argument_units` scoped by `(session_id, session_kind)`.
2. `**trigger-structure-pass**` (new, mirrors `trigger-deep-perf`) — invoked on record mount and on session completion. Live mode = incremental (no `UNRESOLVED`); post-session = full re-run with `UNRESOLVED` enabled.

Model: `google/gemini-3-flash-preview` via Lovable AI gateway. Same 150s edge-timeout discipline (chunked passages, no Pro model).

Prompts live verbatim from the user's spec in `supabase/functions/_shared/structure-prompts.ts`.

---

## Part D — Frontend changes

- `**ArgumentMapContent.tsx**` — split into two children:
  - `TranscriptPane.tsx` — subtopic-grouped pure transcript + rhetorical insight overlay.
  - `ThreadedRecordPane.tsx` — new threaded view consuming `argument_units` (anatomy spans + relationship connectors).
- `**AnatomyCard.tsx**` (new) — renders one argument unit with labeled part spans and absence diagnostics.
- `**RelationshipConnector.tsx**` (new) — gray connector between cards with tag label + hover note.
- `**useArgumentUnits(sessionId, sessionKind)**` (new hook) — fetch + realtime subscribe to `argument_units`.
- Wire into: `ImportedRecordPage`, `DebateRoomPage` (argument map overlay), `ExploreDebateDetailPage` (archive), `SessionRecordViewV2` (live).
- Trigger `trigger-structure-pass` on mount (debounced) for any session lacking units, and on session completion.

---

## Part E — Mode switching

Track `{ isLive, sessionComplete }` per session:

- `isLive` → incremental structural pass, `UNRESOLVED` suppressed.
- `sessionComplete` → full re-pass, `UNRESOLVED` enabled, re-render adds "unresolved — this point was not addressed" badge on flagged cards.

---

## Memory updates

- Update `mem://index.md` Core: definition of "argument map" = dual feature (transcript + threaded record), two analyses (rhetorical vs structural).
- New `mem://features/argument-map-structure` — taxonomy of anatomy parts + relationship tags + display rules (neutral gray connectors, standalone concession styling, UNRESOLVED is post-session only).

---

## Build order

1. Memory + schema (migration: `argument_units` table, RLS, GRANTs).
2. `_shared/structure-prompts.ts` + `analyze-structure` + `trigger-structure-pass` edge functions.
3. `TranscriptPane` (simplify — fastest visible win).
4. `AnatomyCard` + `RelationshipConnector` + `ThreadedRecordPane` + `useArgumentUnits`.
5. Wire into all four surfaces (imported, debate overlay, archive, live).
6. Test on the imported record currently open, then on a completed debate.

## Open questions before I start

1. Should `argument_units` fully replace the `arguments` table for post-session display, or live alongside it (live authoring writes `arguments`, structural pass writes `argument_units`)? My default is the latter — safer.  
What is the difference? Draw it up for me in html in the chat.
2. For the imported pass, should structure run automatically on import (alongside rhetorical), or only when the user opens the threaded record tab? Default: auto on import for parity with `trigger-deep-perf`.  
Auto on import. The argument mpa needs both. That is the full product. Users will be able to view the rhetorical/logical quality of the actual trasncript and view the anatomy of what went down.  
Also, just for the record: the insights button will trigger the overlay (highlight + tag) above the transcript. there are no insights for the threaded record because it is just a display of the anatomy of the conversation that was had, which is assembled by the criteria that was recently transmitted with its corresponding tags. the tags determine the structure.