

# Post-Session Record Redesign

A study-first, dynamo-styled record page. Hierarchical at-a-glance reading on the left, full transcript on the right, with private notebook + AI cross-references as study aids.

## Layout (default state)

```text
┌──────────────────────────────────────────────────────────────────┐
│  ← Back        MAIN TOPIC (Instrument Serif, large)        Share │
│                Date · Duration · Ended · [Tags]                  │
├──────────────────────────┬───────────────────────────────────────┤
│ THREADED RECORD          │ FULL TRANSCRIPT                       │
│ (left pane, default 55%) │ (right pane, default 45%)             │
│                          │                                       │
│ ▼ 1. Subtopic A          │ 10:02  Alex                           │
│    One-line description  │ "Verbatim text…"                      │
│    ▸ Thread 1 — title    │                                       │
│    ▼ Thread 2 — title ⁵  │ 10:03  Sam                            │
│      One-line conflict   │ "Response…"                           │
│      • Main — Alex       │ ──────────────                        │
│        Summary line.     │ 10:05  Alex …                         │
│        [View transcript] │                                       │
│        ─── citation ───  │                                       │
│      ↳ Counter — Sam     │                                       │
│        Summary line.     │                                       │
│      • Rebuttal — Alex   │                                       │
│        Summary line ²    │                                       │
│                          │                                       │
│ ▶ 2. Subtopic B          │                                       │
└──────────────────────────┴───────────────────────────────────────┘
              [Notebook 📓]  [Q&A 🙂]   (floating, bottom-right)
```

- **Resize**: drag the vertical divider between panes (uses existing `react-resizable-panels`). Both panes scroll independently.
- **Mobile (<768px)**: single column with a top toggle pill `[ Threads | Transcript ]`. No split-pane. Hover-previews become tap-to-open sheets.
- **Default expansion**: Main topic open. Subtopics collapsed (chevron right). Threads collapsed inside subtopics. Click a subtopic → reveals threads (collapsed). Click a thread → reveals its summaries (always shown when thread open).

## Hierarchy & content rules

- **Main topic**: session title only. Always visible as page header.
- **Subtopic**: from existing `subtopics[]`. AI-generated one-line description shown beneath title (reuse `summaries` payload field; if absent, derive once via `analyze-transcript` augment).
- **Argument Thread**: from existing `threadTitles` map. One-line conflict summary shown when expanded.
- **Argument Summary** (new granularity — **per role-group, not per entry**):
  - Role groups: `main`, `counter`, `rebuttal`, then a new `main` when the claim shifts.
  - Bullet style: `•` for main/rebuttal, `↳` for counter. Speaker label after em-dash.
  - Each summary card has: summary text, `[View transcript]` link (jumps right pane + flashes the cited entries), optional citation strip.
- **Citation strip** (host-entered only): a slim 1px divider directly under a summary with citation text + link. No strip rendered when no citation exists.

## Interactive study tools

### 1. Hover/long-press preview bubble
- Hovering (desktop) or long-pressing (mobile, 400ms) an Argument Summary opens a translucent floating bubble:
  - **Top half**: source transcript excerpt (verbatim, time-stamped).
  - **Slim divider** + **bottom half**: citation (only if host entered one).
- Click either half → scrolls right pane to the source / opens citation URL.
- Bubble is **preview only** — no text selection inside it. Highlighting requires expanding the summary first (rule #9).

### 2. AI cross-reference footnotes
- Superscript markers `¹ ² ³` appended inline to thread titles or summary text.
- Three semantic colors (max 3 marker colors per item):
  - 🔴 **Red** — contradiction (highest priority)
  - 🔵 **Blue** — shared evidence/citation (medium)
  - 🟢 **Green** — restated claim (low)
- **Cluster rule**: if more than 3 cross-refs exist on one node, render a **single** marker `¹⁻⁵` that opens a list popover showing all refs with their colors.
- Hover marker → small bubble previews the linked summary; click → scrolls + flashes target node (cross-subtopic if needed). Numbering is **global per session**; renumbers on edit/merge.

### 3. Highlight → annotate
- When the user selects text inside an **expanded** Argument Summary or transcript bubble, a small floating action chip `[ Annotate ]` appears at the selection's top-right.
- Click → translucent popover with a textarea. Saving stores `{excerpt, note, anchor: {sessionId, nodeId, charRange}, createdAt}` in the user's private notebook (Annotations tab).
- Selections inside hover-preview bubbles do **not** trigger the chip (per rule #9).

### 4. Notebook (draggable, resizable, private)
- Floating button bottom-left of viewport (mirrors Q&A button on the right). Opens a draggable, resizable panel (reuse `FloatingOverlay` pattern from `NotebookOverlay.tsx`; add corner/edge resize handles).
- **Three Chrome-style tabs** (rounded top, active tab bg = white, inactive = `rgba(0,0,0,0.04)`):
  1. **Thoughts** — free-text editor, paste images supported (stored as data URLs in MVP; storage bucket later).
  2. **Annotations** — list of all annotations for this session. Each row: highlighted excerpt (italic) + user note + small `↗` to jump to source in argument map.
  3. **My Take** — AI-consolidated summary (see below). Empty state until first generation.
- **Auto-save**: debounced 1s writes to `notebooks` table (per-session-per-user).
- **AI consolidation trigger** (rule #6): fires **only when the user navigates away** from the record page (route change or tab close via `beforeunload`). Sends Thoughts + Annotations to Lovable AI Gateway (`google/gemini-2.5-flash`) → produces a legible consolidation → writes to `My Take` tab → emits a notification ("Your take is ready").
- **My Take card**: editable, with `×` in top-right to delete. User can edit freely before publishing.
- **Publish button** in My Take footer: wired to **profile page** (rule #7). MVP: writes notebook with `published: true` flag and surfaces a "Published Takes" section on `ProfilePage`. Storage/listing UI for all notebooks comes in a later build.

## Transcript pane (right side)

- Reuses existing `SpeakerBubble` rendering (preserves rename/split/merge for owner).
- Each bubble gets a stable `data-entry-id` so `[View transcript]` links can scroll + flash (yellow glow 800ms).
- Owner controls hidden in shared/read-only view.

## Visual style (dynamo)

- Pure white bg `#ffffff`, black text `#0a0a0a`. Borders `0.5px solid rgba(0,0,0,0.1)`.
- Headings: Instrument Serif, antialiased. Body: DM Sans.
- Subtopic/thread headers: serif weight medium, no background, bottom hairline divider.
- Summary cards: no card chrome; just left padding to indicate hierarchy depth (`pl-4`, `pl-8`, `pl-12`). Role-group bullet glyph in muted gray.
- Hover bubble: `bg-white/85 backdrop-blur` with hairline border + soft shadow.
- Footnote markers: small (10px), superscript, color-coded; underline on hover only.
- Notebook panel: white bg, hairline border, Chrome tabs styled as described, drag handle is the top eyebrow strip, resize from any edge/corner.
- Floating buttons: 44px circles, white bg, hairline border, shadow-sm.

## Data model changes

New tables (migration):

- `session_notebooks`
  - `id uuid pk`, `session_id uuid`, `user_id uuid`, `thoughts jsonb` (rich text + image refs), `my_take text`, `published boolean default false`, `published_at timestamptz`, `updated_at`, `created_at`. Unique `(session_id, user_id)`. RLS: owner-only (`user_id = auth.uid()`); plus public SELECT when `published = true` for profile listing.
- `session_annotations`
  - `id uuid pk`, `session_id uuid`, `user_id uuid`, `node_kind text` (`summary` | `transcript`), `node_id text`, `excerpt text`, `note text`, `char_start int`, `char_end int`, `created_at`. RLS: owner-only.
- `session_cross_refs` (AI-generated)
  - `id uuid pk`, `session_id uuid`, `from_node text`, `to_node text`, `kind text check in ('contradiction','shared_evidence','restated')`, `created_at`. RLS: same as parent live_session via `can_view_live_session(session_id)`.
- `session_citations` (host manual)
  - `id uuid pk`, `session_id uuid`, `summary_node_id text`, `text text`, `url text`, `created_by uuid`, `created_at`. RLS: SELECT via `can_view_live_session`; INSERT/UPDATE/DELETE only when `is_live_session_host(session_id)`.

Extend `live_sessions.summaries` JSON to include per-role-group summaries (`{node_id, kind: 'main'|'counter'|'rebuttal', text, source_entry_ids[]}`) generated by an augmented `analyze-transcript` pass.

## Edge function work

- **Augment `analyze-transcript`**: emit per-role-group summaries + subtopic one-liner descriptions. No per-entry summaries (rule #3).
- **New `detect-cross-refs`**: scheduled at session end (and on transcript edit). Uses `google/gemini-2.5-pro` to classify pairs into the 3 kinds. Caps output at top-N per node by confidence; UI clusters anything beyond 3 markers.
- **New `consolidate-notebook`**: invoked from client `beforeunload`/route-leave. Inputs: thoughts + annotations. Output: cleaned narrative summary. Writes to `session_notebooks.my_take`. Sends in-app notification.

## Component plan

- `src/components/live/record/SessionRecordViewV2.tsx` — top-level layout, replaces `SessionRecordView`.
- `src/components/live/record/ThreadedRecordPane.tsx` — left pane, hierarchy renderer.
- `src/components/live/record/TranscriptPane.tsx` — right pane wrapper (reuses `SpeakerBubble`).
- `src/components/live/record/SummaryCard.tsx` — role-group summary with hover preview, `[View transcript]`, citation strip.
- `src/components/live/record/HoverPreviewBubble.tsx` — translucent two-half bubble.
- `src/components/live/record/FootnoteMarker.tsx` + `FootnoteListPopover.tsx` — superscript marker + clustered list.
- `src/components/live/record/HighlightAnnotateLayer.tsx` — selection listener + chip + popover.
- `src/components/live/record/NotebookPanel.tsx` — Chrome-tabbed, draggable, resizable; tabs: `ThoughtsTab`, `AnnotationsTab`, `MyTakeTab`.
- `src/hooks/useSessionNotebook.ts`, `useSessionAnnotations.ts`, `useCrossRefs.ts`, `useCitations.ts`.
- `src/pages/ProfilePage.tsx` — append "Published Takes" section.

Replace `SessionRecordView` import sites in `LiveSessionPage` and `SharedLiveSessionPage` with `SessionRecordViewV2`. Keep `RecordQAChat` floating button unchanged.

## Build order

1. Migrations + RLS for the 4 new tables.
2. `SessionRecordViewV2` shell with split-pane + hierarchy renderer (no tools yet).
3. `analyze-transcript` augmentation for per-role-group summaries + subtopic descriptions.
4. Hover preview bubble + `[View transcript]` jump/flash.
5. Citations (host manual entry UI in owner mode + slim divider).
6. Notebook panel (Thoughts + Annotations tabs, persistence).
7. Highlight → annotate flow.
8. `detect-cross-refs` function + footnote markers + clustered popover.
9. `consolidate-notebook` function + My Take tab + leave-page trigger + notification.
10. Profile "Published Takes" section + publish action.
11. Mobile fallback (toggle pill, tap-to-open sheets).

## Out of scope (explicit)

- Cross-session notebook storage / browser (called out for "later in the build").
- Highlighting inside hover-preview bubbles.
- Per-entry AI summaries.
- AI-fetched citations.
- Comments/reactions on shared records.

