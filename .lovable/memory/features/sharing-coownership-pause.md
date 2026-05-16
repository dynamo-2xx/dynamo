---
name: Record Sharing, Co-ownership & Universal Pause
description: Viewer/Co-owner sharing across Debate/Live/CMM/Notebook with propose-and-approve forks on completion, plus host-only Pause/Resume uniform across formats
type: feature
---

## Sharing model
- **Record types covered**: Debate, Live, CMM, Notebook (all).
- **Tiers**:
  - **Viewer**: read-only access to private records. No edit, no invite, no publish.
  - **Co-owner**: may edit, delete (own fork only), invite, transfer, toggle publish — but every change on the **original** record must be approved by the original creator. Co-owner keeps a **personal fork** with full control (no approval needed).
- **Original creator** is sole authority for: hard-delete of the original, transfer of ownership, approve/reject proposed changes, removing co-owners/viewers.

## Forking rule (locked)
- Forks are created **only when the parent record reaches its completed state**:
  - Debate / CMM: `status = 'completed'`
  - Live: `status = 'recording_complete'`
  - Notebook: `published = true`
- During in-progress, a co-owner has the role assigned but **no fork row exists yet**.
- Fork is a **one-way snapshot** at completion time: independent row in the same table, with `forked_from_id` + `forked_at`. No sync back to parent, no field-level merging.

## Invite flow
All three entry points supported:
1. Followers/connections dropdown
2. Search any user by handle/email
3. Shareable link `/share/<token>?role=viewer|co_owner` (30-day expiry, token-hashed, mirrors `debate_invitations` pattern)

## Tables & helpers
- `record_shares` (record_type, record_id, user_id, role enum: `viewer` | `co_owner`)
- `record_share_invitations` (token-hashed, expires_at)
- `record_change_proposals` (change_type enum: `edit_metadata`, `edit_content`, `invite_user`, `remove_user`, `toggle_publish`, `propose_delete`, `propose_transfer`)
- New columns on `debates`, `live_sessions`, `session_notebooks`: `forked_from_id`, `forked_at`, `paused_at`
- Helper functions: `is_record_co_owner()`, `is_record_viewer()`, `accept_share_invitation()`, `propose_record_change()`, `decide_record_change()`, `fork_record_on_complete()`
- **RLS pattern**: SELECT gated by `can_view_*`; UPDATE blocked for co-owners via trigger — they must route through `propose_record_change()`.

## Universal Pause/Resume
- **Host-only**, available in **Debate, Live, and CMM** uniformly.
- Sets `paused_at`, broadcasts via Realtime, closes Deepgram socket, mic indicator turns amber, subtitles hide, live analysis halts, turn timer freezes.
- Resume reopens Deepgram socket from current transcript tail (no re-summarization).
- Auto-resume on host reconnect within 5 min.
- Pause duration is **excluded** from turn-time accounting.
- Participants see "Paused by host" status.

## Out of scope (v1)
- Real-time collaborative editing (CRDT)
- Fork-to-parent sync
- Field-level granular permissions
- Multi-creator / co-owner subdelegation
- Live session recovery after >24h pause