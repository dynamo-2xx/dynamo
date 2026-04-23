

# Reader notes on shared notebooks

Let signed-in recipients of a shared notebook leave **unlimited** notes (free-form OR pinned to a specific Thought / My Take excerpt). The owner sees an envelope button with an unread count, opens an inbox of notes, and each note also auto-creates / appends to a real DM thread with the sender.

## User stories

1. **Recipient (signed-in)** opens a `/study/shared/<token>` link → sees the notebook + a persistent "Leave a note" composer they can use as many times as they want. Each submission creates a new note. They can edit/delete their own notes.
2. **Recipient (anonymous)** sees the notebook in read-only mode plus a "Sign in to leave a note" CTA that routes through `/auth` and returns to the shared page.
3. **Owner** sees a new envelope button on their notebook (next to the maximize/close controls) with a red bubble showing the count of **unread notes** (not senders).
4. **Owner clicks envelope** → side panel opens listing every note (sender avatar + name + timestamp + pin context if any + body). Each note has its own bordered card with an `×`. `×` marks that single note read+dismissed-from-Thoughts. A "Clear all" button at the top dismisses everything.
5. **Notes also surface inline in the Thoughts tab** as bordered "Note from <name>" cards above the user's own thoughts, each with `×`. Dismissing here mirrors the envelope dismiss.
6. **DM mirror**: every note inserts a `dm_messages` row in the recipient↔owner thread (created on first note) so back-and-forth continues in Messages.

## Database

New table `notebook_reader_notes`:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `notebook_id` | uuid | references `session_notebooks.id` |
| `sender_id` | uuid | `auth.uid()` of recipient |
| `body` | text | the note |
| `anchor_kind` | text nullable | `thought` \| `my_take` \| null |
| `anchor_excerpt` | text nullable | quoted text the note pins to |
| `anchor_char_start` / `anchor_char_end` | int nullable | offsets within source field |
| `dm_thread_id` | uuid nullable | DM thread the note was mirrored into |
| `dismissed_from_thoughts` | bool default false | owner toggled `×` in Thoughts |
| `read_at` | timestamptz nullable | owner opened it in envelope |
| `created_at` / `updated_at` | timestamptz | |

RLS:
- **Sender**: `INSERT` if signed in AND notebook has non-null `share_token`. `SELECT`/`UPDATE`/`DELETE` own rows.
- **Owner**: `SELECT`/`UPDATE` any note where they own the notebook (via `is_notebook_owner` SECURITY DEFINER helper).
- No per-user note limit.

RPCs:
- `submit_reader_note(_token, _body, _anchor_kind, _anchor_excerpt, _anchor_char_start, _anchor_char_end)` → resolves notebook by share token, inserts note, calls `get_or_create_dm_thread(owner_id)`, inserts a `dm_messages` row with the body, stores `thread_id` on the note. Returns the new note row.
- `get_shared_notebook_for_reader(_token)` → returns notebook + the caller's existing notes list (so they see and can manage their history on revisit).

Realtime: add `notebook_reader_notes` to `supabase_realtime` publication so the envelope count updates live for the owner.

## Frontend

### Shared notebook page (`src/pages/SharedNotebookPage.tsx`)
- Persistent composer at the bottom: textarea + Submit. After submit, clears and stays open for the next note.
- Selection-pin affordance: highlighting text inside the rendered Thoughts or My Take section reveals a "Pin note here" pill that captures `anchor_kind`, `anchor_excerpt`, and offsets for the next submission.
- Above the composer: the recipient's own previously-submitted notes, each with edit/delete.
- Unauthenticated state → composer disabled with "Sign in to leave a note" → routes to `/auth?redirect=<current path>`.

### Owner notebook (`NotebookPanel.tsx` + `MyStudyDetailPage.tsx`)
- New header icon button: `Mail` icon with red bubble = `unreadNoteCount`. Sits left of the maximize/close cluster. Hidden on shared-only views.
- Click → opens a `ReaderNotesPanel` (slide-in side panel on desktop, full sheet on mobile). Lists every note as a bordered card: sender avatar + name (links to public profile), timestamp, "Pinned to: <excerpt>" if anchored (clicking it jumps to the pinned text via existing jump infrastructure), body, and `×` dismiss.
- `×` → `update` row: `dismissed_from_thoughts = true`, `read_at = now()`. Envelope count decreases.
- "Clear all" → bulk update of all undismissed notes for this notebook.

### Thoughts tab (`src/components/live/record/notebook/ThoughtsTab.tsx`)
- Above the user's own textarea, render every note with `dismissed_from_thoughts = false`. Bordered (0.5px hairline), shows pin excerpt as quoted prefix if anchored, body below, sender label, `×` in top-right that mirrors the envelope dismiss.

### Messages
- No new code. `submit_reader_note` already inserts into `dm_messages`, so the thread surfaces in `/messages` for both users automatically.
- Tag the inserted message with `metadata = { kind: "notebook_note", notebook_id }` so `ThreadView` can render a small "💌 Left a note on <notebook>" prefix on those messages.

### New files
- `src/hooks/useReaderNotes.ts` — owner-side: load notes for a notebook, expose `unreadNoteCount`, `dismiss(noteId)`, `clearAll()`, realtime subscription.
- `src/hooks/useMyReaderNotes.ts` — recipient-side: load own notes for a shared token, `submit`, `update`, `delete`.
- `src/components/study/ReaderNotesPanel.tsx` — owner-side envelope inbox.
- `src/components/study/ReaderNoteCard.tsx` — shared bordered card (used in Thoughts + inbox).
- `src/components/study/LeaveReaderNoteComposer.tsx` — recipient composer + selection-pinning.

## Files touched

- **Migration** (new): create `notebook_reader_notes`, `is_notebook_owner` helper, `submit_reader_note` and `get_shared_notebook_for_reader` RPCs, RLS policies, realtime publication add.
- `src/pages/SharedNotebookPage.tsx` — composer, selection pinning, own-notes list, auth gate.
- `src/components/live/record/NotebookPanel.tsx` — envelope button + count + panel mount.
- `src/pages/MyStudyDetailPage.tsx` — same envelope + panel on desktop view.
- `src/components/live/record/notebook/ThoughtsTab.tsx` — render reader-note cards above user textarea.
- `src/components/messages/ThreadView.tsx` — render "Left a note on <notebook>" label when `metadata.kind === "notebook_note"`.

## Out of scope

- Anonymous note submission.
- Per-note threaded replies inside the notebook (back-and-forth happens in DMs).
- Email or push notifications (envelope + DM are the only surfaces).
- Owner editing or redacting a recipient's note.
- Reactions, attachments, or inline images on reader notes.

