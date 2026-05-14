---
name: Section 21 — Performance Intelligence Layer (Premium)
description: Premium-only inline analysis layer — toggleable color/face filter, live light pass + post-session deep pass, 3 dashboard surfaces, Dynamo handoff via quoted message
type: feature
---

## Scope
A Premium-tier UI/UX layer that sits on top of the existing Performance Summary / `debate_grades` system. Analyzes speaker transcripts for 4 attribute groups:
1. **Argumentative Integrity** — logical consistency, contradiction risk, evidence handling
2. **Rhetorical Effectiveness** — clarity, framing, persuasive moves
3. **Engagement Quality** — opposition response, listening signals, concession patterns
4. **Cognitive Depth** — abstraction, originality, synthesis

## Pass timing
- **Live light pass** — streams during the session. Produces underline + brief reason only (no recommendation). Kept cheap with `google/gemini-3-flash-preview`.
- **Post-session deep pass** — runs once on session end (chained off `consolidate-session`). Produces full popup explanation + actionable recommendation. Confirms or revises live-pass annotations.

## Severity scale (risk/issue grade)
- **Green (smiley)** = clean / no concerns flagged
- **Orange (neutral)** = concern worth reviewing
- **Red (sad)** = clear problem to address

Underline color is the primary signal. Face icons are the colorblind-redundant signal (per §7) and live inside the popup.

## Inline annotation interaction (toggle-based, NOT always-on)
Default state: transcripts render clean — NO underlines visible.

A "Show insights" toggle (Premium-only chip in transcript header) opens a 3-marker legend tray:
- 🟢 smiley · 🟠 neutral · 🔴 sad
- Click a marker → reveal ALL annotations of that severity in the current view (underlines fade in on the matching passages).
- Markers with zero annotations of that severity render in disabled/dark state and aren't clickable.
- Click an underlined passage → popup with explanation (live pass) or explanation + recommendation (post-session).

This applies to:
- In-room transcript bubble (live pass results)
- Record archive transcript pane (deep pass results)
- Threaded record view

## Dashboard surfaces (all three required)
1. **Inside Performance Summary** — extends `DebateGradeReportPage` with a Premium-only "Intelligence" tab showing per-group score breakdown, top concerns, and top problems.
2. **Standalone page** — `/records/:id/intelligence` route, linked via a Premium badge on the record hero. Full-width view with all annotations grouped by attribute.
3. **Floating overlay** — Premium-only third bubble alongside Argument Map and Notebook (in-room and on-record). Same FloatingOverlay pattern. Mirrors the standalone page contents, scoped to the current subtopic when possible.

## Dynamo handoff
Every popup (explanation OR recommendation) has a "Discuss in Dynamo" button.
- Clicking opens the Dynamo chat tab (existing `DynamoChatPane`).
- The snippet (the underlined passage + the explanation/recommendation text) is injected as the **first user message in quote-block format** so Dynamo replies with full context.
- Source linkage stored invisibly so Dynamo's reply can hotlink back to the exact transcript line via the existing CitationModal pattern.

## Free-tier paywall
- Free users see annotations as **blurred underlines** with a lock icon overlay.
- Click the blurred area → upgrade modal: "Upgrade to see what Dynamo flagged."
- The "Show insights" toggle is visible but opens the upgrade modal directly for free users.
- Performance Intelligence dashboard surfaces (tab, page, overlay) all show a blurred preview + upgrade CTA.

## Data model (high level)
New table `performance_annotations`:
- `id`, `session_id`, `session_kind` (debate/cmm/live), `participant_id`, `subtopic_id`
- `transcript_entry_id` (or character offsets for sub-passage anchoring)
- `attribute_group` (1 of 4), `sub_attribute` (free-text key)
- `severity` (green/orange/red)
- `pass_kind` (live | deep)
- `explanation` (text), `recommendation` (text, deep pass only)
- `created_at`

RLS: gated via `public.can_view_debate(...)` / equivalent helper per session_kind. Premium check enforced server-side in the analyze edge function (free users get 402 response, NOT silent skip).

## Out of scope for v1
- Cross-session trend analytics (Premium v2)
- Comparative annotations vs other speakers
- Public sharing of annotations (always private to speaker + owner)
- Auto-recommendations during live pass (post-session only)
