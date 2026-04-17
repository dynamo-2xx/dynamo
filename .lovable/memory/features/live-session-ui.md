---
name: Live Session UI
description: Subtopic-grouped layout, with collapsible AI-titled argument threads inside each subtopic. Counters indented and labeled.
type: feature
---

The Live recording interface and archived records (`SessionRecordView`) use a unified subtopic-grouped layout with collapsible **argument threads** inside each subtopic.

**Hierarchy**:
- Subtopic dropdown (default open) — labeled by AI from full conversation analysis
  - Thread row (default collapsed, `<Collapsible>`) — AI-generated 3–7 word title capturing the specific point
    - Threaded transcript cards — counters indented with "Counter" pill and `CornerDownRight` icon

**Components**:
- `LiveThreadView` (shared by live recording + record): renders threads inside an already subtopic-scoped entry list. Falls back to a flat list when entries lack `thread_id` (old sessions).
- Threads sourced from `useLiveTranscription` hook's `threads` state, which is also persisted as a `__threads_meta__` sentinel record inside the `live_sessions.summaries` JSONB so shared/loaded views can recover titles.

**Title rules** (set in edge function prompt):
- Title MUST differ from the subtopic label.
- Threads scoped within a subtopic; subtopic change closes the open thread.
- Roles: `argument` (starts thread), `counter` (rebuts a prior entry, sets `parent_entry_id`), `continuation` (extends the same point).

**Live behavior**: titles appear once the thread has ≥2 entries; single-entry threads show "New thread" as a placeholder.
