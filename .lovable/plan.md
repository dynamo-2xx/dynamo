## §23 — Record Sharing, Co-ownership & Universal Pause (v1)

Add a universal sharing layer to **debates** (incl. CMM), **live sessions**, and **notebooks**. Two tiers: **Viewer** and **Co-owner** (propose-and-approve). Forking happens only on **completed** records. Also adds host-only **Pause/Resume** uniformly across Debate, CMM, and Live.

---

### Sharing model

**Tiers**
- **Viewer** — sees private record; cannot edit. No fork.
- **Co-owner** — can propose edits, invites, publish toggles, deletes, transfers. Every mutation lands in a **pending change** queue; original creator approves/rejects. On record completion, co-owner auto-receives a **personal fork** they fully own.

**Original creator** — sole power to delete, transfer, approve/reject proposals, remove co-owners.

**Forking rule (locked)**
- Fork is created **only when the parent record reaches a completed state**:
  - Debate / CMM: `status = 'completed'` (end of session)
  - Live: `status = 'recording_complete'`
  - Notebook: on `published = true`
- During an in-progress session, co-owner has the role but no fork yet.
- Fork is a one-way snapshot: independent row, `forked_from_id` + `forked_at` set, no ongoing sync.
- Debates fork: topic/subtopics/sides config copied; participants reset.
- Live fork: metadata + transcript snapshot copied; analysis re-runnable by new owner.
- Notebook fork: `thoughts` + `my_take` copied.

**Invite flow (all three)**
1. Pick from followers/connections
2. Search any user by handle/email
3. Shareable link `/share/<token>?role=viewer|co_owner` (token-hashed like `debate_invitations`)

---

### Database

New tables (RLS-on):
- `record_shares (record_type, record_id, user_id, role, invited_by, accepted_at)` — role enum `viewer | co_owner`. Unique on `(record_type, record_id, user_id)`.
- `record_share_invitations` — hashed-token links, expiry, claim tracking.
- `record_change_proposals (record_type, record_id, proposed_by, change_type, payload jsonb, status, decided_by, decision_reason)` — change_type enum: `edit_metadata | edit_content | invite_user | remove_user | toggle_publish | propose_delete | propose_transfer`.

Columns added to `debates`, `live_sessions`, `session_notebooks`:
- `forked_from_id uuid null`, `forked_at timestamptz null`

New columns for Pause:
- `debates.paused_at timestamptz null`, `debates.pause_reason text null`
- `live_sessions.paused_at timestamptz null`
- (CMM piggybacks on `debates.paused_at` since CMM is a debate format)

Helper functions (SECURITY DEFINER):
- `is_record_co_owner(_type, _id)` / `is_record_viewer(_type, _id)`
- Extend `can_view_debate` / `can_view_live_session` / shared-notebook helpers to OR in `is_record_viewer(...)`.
- `accept_share_invitation(_token)` — claims slot; if record already completed and role = co_owner, immediately forks; otherwise sets `accepted_at` and defers fork to completion trigger.
- `propose_record_change(_type, _id, _change_type, _payload)` — co-owner only.
- `decide_record_change(_proposal_id, _approve, _reason)` — creator only; applies payload on approve.
- `fork_record_on_complete()` — trigger fired when status flips to completed; forks for all accepted co-owners.

RLS pattern: SELECT gated by `can_view_*`. UPDATE allowed for creator; co-owner raw UPDATEs blocked by trigger — must go through `propose_record_change`.

---

### Pause / Resume — uniform across Debate, CMM, Live

Host-only button rendered identically in all three room toolbars (next to End / Next Turn / etc.).

**Common behavior**
- Sets `paused_at = now()` on the record; broadcasts via Realtime
- Deepgram socket closes; mic indicators turn amber; subtitles hide
- Analysis intervals halt (Live + CMM); turn timer freezes (Debate)
- All participants see a "Paused by host" badge with elapsed pause time
- **Resume** clears `paused_at`, reopens socket, resumes analysis from current transcript tail (no re-summarization of past), unfreezes timer
- Auto-resume if host disconnects during pause and reconnects within 5 min
- Pause duration excluded from time-per-turn accounting (Debate/CMM)

**Where added**
- `FacilitatorView.tsx` (Debate) — already has Pause for the turn timer; extend to also halt transcription/analysis (currently only pauses timer)
- `ChangeMyMindRoomPage.tsx` (CMM) — add Pause button to host control panel
- `LiveSessionPage.tsx` (Live) — add Pause button next to End

---

### UI — Sharing

**Share button** added to record headers (Debate room, CMM room, Live room, Notebook overlay, Record/Archive view). Opens `ShareDialog`:
- Tab 1: **People with access** — list with role pills, remove (creator only)
- Tab 2: **Invite** — search + dropdown + role selector + send
- Tab 3: **Get link** — generate role-scoped token URL, copy, revoke

**Pending changes inbox** — `/agenda?tab=approvals`. Each proposal shows proposer avatar, diff summary, Approve / Reject / Reject-with-reason. Bell notification on new proposal.

**Co-owner edit affordance** — Save button relabeled **"Propose change"**; toast confirms it was sent. Pending proposals shown as ghost overlay on affected field.

**Fork indicator** — forked records show a "Forked from {original}" chip linking to parent.

---

### Acceptance criteria

- Viewer can open a private debate/live/notebook they were shared on; cannot edit.
- Co-owner edit produces a proposal row; original record unchanged until creator approves.
- Co-owner accept on an in-progress record does NOT fork; fork is created automatically when record completes.
- Co-owner accept on an already-completed record forks immediately.
- Only creator can delete; co-owner delete attempt creates `propose_delete` proposal.
- Share link works authed + unauthed (unauthed → auth gate → claim on return).
- Pause works identically in Debate, CMM, and Live: halts transcription + analysis + timers; Resume continues without context loss.
- Pause duration excluded from Debate/CMM turn-time accounting.
- All new tables have RLS; co-owner cannot bypass approval via raw API.

---

### Not in this plan

- Real-time collaborative editing (OT/CRDT)
- Fork-to-parent sync (snapshot only)
- Field-level granular permissions
- Multi-creator (transfer is full handoff)
- Co-owner subdelegation
- Recovering a Live session paused for >24h (treated as ended)
