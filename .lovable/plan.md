## Goal
Restructure `/my-study/:id` to feel like a Google Doc: `[title row] → [toolbar] → [tabs + doc rectangle]`. Migrate Thoughts, Annotations (editing), and My Take to TipTap rich-text. Add a notebook-level **Publish** button. Public viewer mirrors the owner layout (no toolbar/editing) and gets its **own private Dynamo chatbot**.

## Layout (owner/editor view)

```text
← Back to My Study
Test in EF class  ✎      [✉] [Publish] [Open record ↗] [⤴ Share]
Recorded May 20, 2026

[ B  I  U  S  H1 H2 • 1. 🔗  ↶ ↷ ]            ← toolbar: always visible, identical across tabs
┌──────────────────────────────────────────┐
│ Thoughts │ Annotations · 0 │ My Take │ ✨ Dynamo │
├──────────────────────────────────────────┤
│  tab content                              │
└──────────────────────────────────────────┘
```

- Doc chrome = subtle bordered card.
- Tab strip docks to top edge of the rectangle; active tab connects into the card.

## Toolbar behavior (constant across tabs)
- Toolbar is **always rendered with the same buttons in the same positions**, on every tab.
- Buttons are interactive whenever the focused tab is a rich-text surface (**Thoughts, Annotations editor, My Take**). On Dynamo the buttons appear identical but no-op on click (no greyed/disabled state).
- Active formatting indicators reflect the currently focused editor.
- Hidden entirely on the public viewer.

## Rich-text surfaces (v1)
- **Thoughts**: TipTap full doc.
- **Annotations**: when a note is in edit mode, its `Textarea` becomes a TipTap editor bound to the toolbar. Excerpt stays plain.
- **My Take**: TipTap editor — **fully user-editable, the user writes their own take**. 280-char limit still enforced against plain-text length.

## My Take authorship (default vs optional AI assist)
- **Default**: the user writes My Take themselves. No AI consolidation runs automatically.
- **Optional**: a clearly-labeled secondary action (e.g. "Suggest from my Thoughts + Annotations") sits inside the My Take tab. Clicking it produces a **recommended** draft consolidated from the user's Thoughts and Annotations, which the user can accept, edit, or discard. Nothing is written to My Take without explicit user action.

## Publish button (notebook-level)
- Placed **left of "Open record"**.
- Uses existing `notebooks.published` flag.
- States:
  - Unpublished → `Publish` (primary). Click sets `published = true`, ensures `share_token` exists, toasts "Published to your profile".
  - Published → `Published` + globe icon (outline). Click opens popover with **Unpublish** + copyable public link.

## Public viewer (`SharedNotebookPage`)
Mirrors the owner layout with these diffs:
- **No toolbar.**
- Tabs: **Thoughts, Annotations, My Take, ✨ Dynamo**.
- Thoughts / Annotations / My Take render read-only TipTap (`editable: false`); no edit pencil, no delete, no Publish, no owner Share-menu. Only a "Copy link" button.
- **Dynamo (visitor)** = the visitor's **own private chatbot** scoped to this notebook. Lets them ask questions about the notebook contents.
  - Chat history is per-visitor and **never** shows the owner's Dynamo history. The owner's Dynamo chat is private to the owner always.
  - Anonymous visitors: history persists in `localStorage` keyed by `notebookId`.
  - Signed-in visitors: history persists in a per-user, per-notebook row (visitor_id + notebook_id).
- If a visitor **spawns their own notebook** from this one, their new notebook's Dynamo tab is **seeded with a copy of their existing visitor Dynamo chat history** (if any) for that source notebook. Owner history is never copied.

## Thoughts → TipTap migration
- New `src/components/study/ThoughtsEditor.tsx` (`@tiptap/react` + `StarterKit` + `Underline` + `Link` + `Image`).
- Persist HTML into existing `notebooks.thoughts`. On load, wrap plain text as `<p>` so existing notes load losslessly.
- Paste-image preserved via `editorProps.handlePaste`.
- Page owns the active editor instance per focused tab and passes it to `NotebookToolbar`.

## User stories

**Constant toolbar**
- *As an owner*, the formatting toolbar stays in the same place across all tabs so chrome never shifts.
- *As an owner on Dynamo*, toolbar buttons no-op silently.

**Rich-text everywhere (Thoughts / Annotations / My Take)**
- *As an owner*, I can format Thoughts with bold, italic, underline, strike, H1/H2, lists, and links from the shared toolbar.
- *As an owner editing an annotation note*, the same toolbar formats that annotation in place.
- *As an owner writing My Take*, I write and format my own take with rich text; the 280-char limit checks plain-text length.
- *As a returning user*, my pre-existing plain-text content loads losslessly.
- *As an owner*, I can paste an image directly into Thoughts and it appears inline.

**Optional AI consolidation for My Take**
- *As an owner*, by default no AI runs on My Take — what I type is what's there.
- *As an owner who wants a starting point*, I can click "Suggest from my Thoughts + Annotations" inside the My Take tab to get a recommended draft I can accept, edit, or discard.

**Notebook Publish button**
- *As an owner*, I see Publish to the left of "Open record" and publish the whole notebook in one click.
- *As an owner already published*, the button reads "Published" and lets me copy the public link or unpublish.
- *As a first-time publisher*, the public share link is generated automatically.

**Public viewer parity**
- *As a visitor*, I see the same title row and tabbed doc rectangle the owner sees.
- *As a visitor*, I do not see the toolbar, edit pencils, owner Share menu, or the Publish button — content is read-only.
- *As a visitor*, the tabs I see are Thoughts, Annotations, My Take, and Dynamo.

**Visitor Dynamo (private chatbot)**
- *As a visitor*, I can open the Dynamo tab and chat with a bot about this notebook's contents.
- *As a visitor*, my chat is private to me and never shows the owner's chat history. The owner's Dynamo chat stays private to the owner.
- *As a returning visitor (same browser / same account)*, my chat history with this notebook persists.
- *As a visitor who creates my own notebook spawned from this one*, my new notebook's Dynamo tab is pre-seeded with a copy of my existing visitor Dynamo chat history for that source notebook. The owner's history is never copied in.

## Out of scope (v1)
- Alignment, font size, color, headings beyond H1/H2.
- Comments-as-annotations spawn flow.
- Per-tab independent publishing (notebook-level only; existing My-Take publish toggle inside the tab is unaffected).
- Cross-device sync of anonymous visitor Dynamo history (localStorage is browser-local).
- Automatic AI consolidation of My Take (only available as an explicit user-triggered suggestion).

## Files
- **Edit**: `src/pages/MyStudyDetailPage.tsx`, `src/pages/SharedNotebookPage.tsx`, `src/components/live/record/notebook/AnnotationsTab.tsx` (TipTap edit mode), `src/components/live/record/notebook/MyTakeTab.tsx` (TipTap + opt-in suggest button), notebook spawn handler (seed visitor Dynamo history into new notebook).
- **New**: `src/components/study/NotebookToolbar.tsx`, `src/components/study/ThoughtsEditor.tsx`, `src/components/study/RichTextEditor.tsx` (shared TipTap wrapper for Thoughts/Annotations/My Take), `src/components/study/PublishNotebookButton.tsx`, `src/components/study/VisitorDynamoChat.tsx`, `src/hooks/useVisitorDynamoHistory.ts`.
- **Untouched**: `src/components/live/record/notebook/ThoughtsTab.tsx` (still used by floating overlay).
- **DB**: new table `visitor_dynamo_messages` (notebook_id, visitor_id nullable, anon_key nullable, role, content, created_at) with RLS so a visitor reads/writes only their own rows; owner Dynamo storage stays separate and untouched.
- **Deps**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-image`.

## Acceptance
- Toolbar stays identical across tab switches; formats Thoughts, Annotation-in-edit, and My Take; no-ops on Dynamo.
- My Take is user-authored by default; AI consolidation only runs when the user clicks the suggest action and is staged as a draft for accept/edit/discard.
- Publish button sits left of Open record; toggles `notebooks.published` and exposes the public link.
- Public viewer shows Thoughts / Annotations / My Take / Dynamo, all read-only except the visitor's own Dynamo chat.
- Visitor Dynamo never displays owner messages; owner Dynamo never displays visitor messages.
- Spawning a notebook from a public notebook copies the visitor's prior Dynamo history (if any) into the new notebook's Dynamo tab.
