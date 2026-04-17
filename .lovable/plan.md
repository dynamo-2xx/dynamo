
The user wants threaded arguments (from the previously-approved plan) to be **collapsible under each subtopic**, each with an **AI-generated title** describing the thread's content. This sits on top of the threading work already planned.

Mental model:
```
Subtopic: "Infrastructure Costs"
  ▸ Thread: "Funding via municipal bonds vs. private capital"  [4 entries]
  ▸ Thread: "Long-term maintenance burden"                     [2 entries]
  ▸ Thread: "Cost overruns from comparable projects"           [3 entries]
```
Each thread row is a collapsible. Click to expand → see the threaded argument/counter nodes inside.

Key design decisions to lock in:
- **Title source**: AI-generated as part of the existing Pass 1 analysis (extend the `entry_thread_map` to also return per-thread titles). Cheaper than a separate pass, and the model already has full context.
- **Title style**: Short noun phrase, 3–7 words, sentence case (matches the subtopic style already used).
- **Default state**: Threads collapsed by default (subtopics stay expanded). Avoids a wall of nested content on long sessions.
- **Live view behavior**: Title appears as soon as the thread has ≥2 entries; until then, show "New thread" placeholder so it doesn't flicker.
- **Fallback**: Old sessions without thread metadata → keep current flat rendering (no broken titles).

No new questions — scope is clear and additive to the approved threading plan.

---

# Plan: Collapsible Titled Threads Under Subtopics

## What changes

### 1. Edge function — extend `entry_thread_map` with titles
In `supabase/functions/analyze-transcript/index.ts` (`live_conversation` mode), add a sibling field to the existing thread map:
- `threads`: `{ [thread_id]: { title: string, subtopic: string } }`
- Prompt instruction: "For each thread, generate a 3–7 word title in sentence case that captures the specific point being argued (not the subtopic name). Example: under 'Infrastructure Costs', a thread might be 'Funding via municipal bonds'."

### 2. Hook — persist thread titles
In `src/hooks/useLiveTranscription.ts`:
- Add `live_threads?: Record<string, { title: string; subtopic: string }>` to session state.
- Persist to `live_sessions` JSONB alongside `transcript_entries` (reuse existing fetch-and-merge).

### 3. `LiveThreadView.tsx` — render as collapsibles
The threaded renderer (planned previously) becomes a list of `<Collapsible>` rows, one per thread:
- **Trigger row**: chevron + thread title + entry count badge (matches existing subtopic row styling).
- **Content**: the threaded argument/counter nodes (indented, speaker-colored borders).
- **Default**: collapsed.
- **Title fallback**: if no title yet (live, <2 entries) → "New thread"; if old session (no thread metadata) → flat list with no thread wrapper.

### 4. UI integration (unchanged surfaces from prior plan)
- `SessionRecordView.tsx`: subtopic dropdowns now contain collapsible thread rows instead of a flat list.
- Live recording view: same structure, threads update live as entries are classified.

## Visual structure
```
[Subtopic ▾]  Infrastructure Costs                   12 statements
   [Thread ▸]  Funding via municipal bonds            4 statements
   [Thread ▸]  Long-term maintenance burden           2 statements
   [Thread ▸]  Cost overruns from comparable projects 3 statements
   [Thread ▸]  New thread                             1 statement
```

## Out of scope
- No DB schema changes (titles live inside existing `live_sessions` JSONB).
- No changes to the Debate feature (already threaded; titling can be a follow-up if you want it there too).
- No manual editing of titles in this pass (can be a follow-up).
