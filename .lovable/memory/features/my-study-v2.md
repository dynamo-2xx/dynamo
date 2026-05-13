---
name: My Study v2 (Notebooks)
description: Notebook = optional appendage to a record. Google-Doc style with tabs + comment section. Draggable/resizable/fullscreen overlay scoped to record. Two independent publish toggles (Notebook, My Take). Comments replace reader-notes/inbox; highlighting a comment can spawn a sub-notebook.
type: feature
---

## Core principles
- A notebook is **never standalone** — always linked back to its source record (Debate / CMM / Live / another notebook). Hero card always shows "in response to <record>".
- Notebook is scoped to one record. One floating button (bottom-right of any record) opens it.

## Overlay behavior
- Opens as a **draggable, resizable** floating panel (reuse FloatingOverlay pattern).
- Has a **fullscreen toggle** in the header (next to close).
- UI of the overlay is **identical to its published display page** — Google-Doc feel: tabs row at top, doc body, comment section below.
- Tabs (v1): My Take, Thoughts, Annotations.

## Publishing model — two independent toggles
1. **Publish Notebook** — standalone button at top-right of the notebook display page. Once published, it becomes a **private/public** toggle in the same slot.
2. **Publish My Take** — toggle lives inside the My Take tab. Publishes only the take as a Tweet-style display page (with its own comment section).
- Next to Publish Notebook sits a **Share** button. Works regardless of state (unpublished / private / public). Anyone shared the link becomes a viewer who can comment.

## Display pages
- **Notebook display page**: Google-Doc body + tabs + comment section below (same component as Debate/Live/CMM record comments).
- **My Take display page**: Tweet-style card + comment section below.
- Both render with the same hero card style on profiles, ordered chronologically (single feed for v1, no filter tabs).

## Comments (replaces reader-notes + envelope inbox)
- Comment section lives below every notebook display page (and below My Take display page).
- Reply directly in-thread, OR
- **Highlight a comment** → prompt with two spawn options:
  - `[📓+] [record that was commented on]` — new notebook scoped to the source record
  - `[📓+] [the highlighted comment text]` — new notebook scoped to that comment
- Owner can highlight any comment and **annotate it into the notebook body** (comment-as-annotation).
- No more `useReaderNotes` / `LeaveReaderNoteComposer` / envelope inbox UI.

## Edit ownership
- Only the notebook owner can edit body content, annotations, and toggle publish/private/public.
- Viewers can only comment.

## Spawning rules
- Notebook button visible bottom-right on any record (Debate / CMM / Live / Notebook display / My Take display).
- Spawned notebook stores `parent_record_type` + `parent_record_id` (and `parent_comment_id` when spawned from a highlighted comment).
- Hero card always renders "in response to …" badge linking back.

## Out of scope for v1
- Profile filter tabs (single chronological feed only)
- Reader-notes UI/RLS (deprecate after migration)
- Multi-tab sub-tabs beyond My Take / Thoughts / Annotations
