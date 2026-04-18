

## Plan: Interested Users + Drag-and-Drop Side Assignment in Invite Speakers section

### Questions
None — schema and existing patterns make the requirements clear.

### What I'll build (in `CreateDebatePage.tsx`, Step 3 "Invite Speakers" card only)

**1. Interested users panel (edit mode only, since `debate_interests` requires a saved debate)**
- Below the existing username/email input, a horizontally-scrolling row labeled "Interested" showing avatar + display name pills.
- Source: `debate_interests` joined to `profiles`, filtered by `debate_id = editId`. Excludes anyone already invited or already a participant.
- In create mode (no `editId`): hide this row entirely with a small note "Save the debate first to see interested users."
- Click a pill → adds them to the invited list (as a username pill in the existing `invitedUsernames` array, plus tracked separately so we know their pre-chosen `side_id` if any).

**2. Drag-and-drop side assignment box (below the invite input, replaces the existing flat pill list)**
- Two-column container split by a vertical divider, one column per side from `debate.sides` (uses real labels, e.g., "For" / "Against"). If sides ≠ 2, render N columns side-by-side.
- Each invited user is a draggable card (avatar + display name; falls back to initials for email/unknown invites).
- Above the boxes: an "Unassigned" tray for invites with no side chosen yet.
- DnD: HTML5 native drag/drop (no new dep) — `draggable`, `onDragStart`, `onDragOver`, `onDrop`. Mobile: tap-to-select then tap-a-side as a fallback (current viewport is 833px so DnD is the primary path).
- If an interested user previously chose a side via DM/interest (`debate_interests.side_id`), they auto-appear in that column when added; spectators or unassigned go to the "Unassigned" tray.

**3. Persisting side assignment with the invitation**
- Track invites as `{ username, userId?, sideId?: string|null }[]` in a new `invitedEntries` state (replaces or augments `invitedUsernames`).
- On Save, when inserting into `debate_invitations`, include `side_id` per row (column already exists).
- Email-only invites (no userId) keep working as before — they live in "Unassigned".

### Files

```text
EDIT src/pages/CreateDebatePage.tsx
  - new state: invitedEntries (array of {username, userId?, sideId?, avatarUrl?, source: 'manual'|'interested'})
  - new state: interestedUsers (fetched when editId present)
  - new effect: fetch debate_interests + profiles for editId, exclude already-invited/participants
  - replace flat pill list (lines ~847-864) with: Unassigned tray + per-side drop zones with vertical divider
  - update addInvite/removeInvite to operate on invitedEntries
  - update handleCreateDebate invitation insert to include side_id from each entry
  - keep invitedUsernames derived for backward compat where used (button label only)
```

No new components, no new tables, no migration. Reuses existing `debate_interests`, `debate_invitations.side_id`, `profiles`.

### Confidence
- Interested users fetch + display + click-to-add (edit mode): **95%**
- DnD between Unassigned ↔ Side A ↔ Side B with HTML5 DnD: **92%**
- Auto-placement based on `debate_interests.side_id`: **95%**
- Persisting `side_id` into `debate_invitations` on save: **97%**
- Mobile tap-to-assign fallback: **85%** (will ship; less polished than desktop DnD)

Overall: **~93%**. No incomplete work — DnD will function on desktop, tap-fallback on mobile, edit-mode shows interested users, create-mode shows a clear "save first" hint.

