## Goal

Make `/debate/:id/preview` (the public scheduled-preview page) behave correctly across all three debate states:

| State | Behavior |
|---|---|
| `pending` (pre-launch) | Preview as today (unchanged). |
| `live` | Same preview, with a red **LIVE** pill in the header. The "Interested?" popover offers a **Join as spectator** action (for users not already invited as a speaker), in addition to existing "Queue as speaker / Notify / Message". |
| `completed` | Render the post-session record inline at the same URL, so a refresh swaps preview → record. |

This is scoped to `DebateScheduledPreviewPage.tsx`. The invite-token page (`DebatePreviewPage.tsx` at `/preview/:token`) is for invited speakers and is left as-is.

## Changes

### 1. `src/pages/DebateScheduledPreviewPage.tsx`

- **Remove** the early redirect block (lines 58–61) that pushes to `/debate/:id` when status is `live` or `completed`.
- **Subscribe** to realtime `UPDATE` on the `debates` row by `id`, so a status change (pending → live → completed) flips the UI without a manual refresh. Fallback: a single re-fetch on tab `visibilitychange`.
- **Render branches:**
  - If `debate.status === 'completed'`: render the existing post-session record view used at `/debate/:id` for completed debates. Concretely, lazy-load and render the same component(s) `DebateRoomPage` mounts for the completed branch (the record/transcript view + completion summary), keeping `AppLayout` chrome. If extracting that branch as a shared `<DebateRecordView debateId={…} />` component is too invasive, fall back to `<Navigate to={`/debate/${id}`} replace />` on completed only — but the default approach is inline.
  - Otherwise: render the current `DebateRecordPreview` as today.
- **Live tag:** when `debate.status === 'live'`, pass a `live` flag (or render a `<span>LIVE</span>` red pill above/inside `DebateRecordPreview`'s header). Pulse animation, monochrome with a red accent dot to fit the design system.
- **Interested popover (live only):** add a new option **"Join as spectator"** when:
  - user is signed in,
  - not the owner,
  - not already a `debate_participants` row,
  - not invited as a speaker (no accepted `debate_invitations` for this user).
  Clicking it inserts a `debate_interests` row with `role='spectator'` (default), then navigates to `/debate/:id` (DebateRoomPage already handles spectator role end-to-end).
- Keep the existing "Queue to join as speaker", "Message the publisher", and "Notify me when it starts" options. "Notify me" hides itself when status is `live` or `completed`.

### 2. No DB migration required

`debate_interests.role` already supports `'spectator'` (default). `debate_participants` is unchanged; spectators don't insert a participant row — DebateRoomPage already auto-treats non-participants as spectators (`setUserRole("spectator")` at line 388 of `DebateRoomPage.tsx`).

### 3. Realtime

Add the standard pattern used elsewhere in the codebase:

```ts
supabase
  .channel(`debate-status-${id}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'debates', filter: `id=eq.${id}` },
      (p) => setDebate((d) => ({ ...d, ...p.new })))
  .subscribe();
```

`debates` is already in `supabase_realtime` (added in the prior lobby-auto-launch migration), so no migration is needed.

## Acceptance

- Opening `/debate/:id/preview` while status is `pending` looks identical to today.
- When the host launches the session, the preview stays mounted and gains a red **LIVE** pill within a couple of seconds (realtime), and the "Interested?" popover gains a "Join as spectator" entry.
- A non-invited viewer can click "Join as spectator" and land in `/debate/:id` as a spectator with no participant-row side-effects.
- When the session ends, refreshing `/debate/:id/preview` shows the post-session record view inline at the same URL (no redirect bounce).
- The invite-token flow (`/preview/:token`) is unchanged.

## Out of scope

- Live realtime swap preview → record at the exact moment of completion (we only guarantee it on refresh, as the user requested).
- Adding a spectator surface to the invite-token preview page.
- Any DB schema changes.
