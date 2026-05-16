---
name: Continue button on completed records
description: "Continue" reopens completed Debate/CMM/Live records as linear chained continuations (v1, v2, v3…); never on Notebooks
type: feature
---

# §24 — Continue button

**Available on**: completed Debate, CMM, Live. **NEVER on Notebooks** (always editable).
**Trigger**: original owner only at v1. Co-owners use §23 proposal flow.

## Per-format behavior
- **Live** → opens a brand-new Live session, marked as continuation. Entries appended into the same merged record view below a divider.
- **Debate / CMM** → clones the template (topic, subtopics, sides, settings, cover, tags) into a new record. Original stays immutable.

## Scope prompt (modal on click)
"Bring participants from previous session?" → Yes (auto re-invite original speakers/invitees) / No (empty, owner only). Asked every click.

## Linkage
Linear chain only. Each continuation stores `continued_from_id`, `continuation_index` (v1, v2, v3…), and `continuation_root_id`. **No branching/forks at launch.**

## UI
- Divider row in transcript: thin black line + chip `"Continuation 2 · May 16, 2026 · 14:32"`.
- Each transcript entry shows small `v1` / `v2` badge in speaker row.
- Header chip: `"Continuation 2 of 3 →"` linking next/prev.
- Argument Map, Q&A, comments operate over full merged chain by default; toggle to scope to one version.

## Data model (build phase)
Add to `debates` and `live_sessions`:
- `continued_from_id uuid` (nullable)
- `continuation_index int default 1`
- `continuation_root_id uuid` (self on v1)

For Live: new `session_id` per continuation joined via root; divider derived from join.

## Quota
Each Continue consumes one record from monthly tier quota (§12). No discount.
