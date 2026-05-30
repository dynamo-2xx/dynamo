## 1. X on invited chip rescinds invitation / kicks from lobby

In `CreateDebatePage.tsx` `removeInvite(entry)`, in addition to removing from local `invitedEntries` state, when `debate.id` exists also:

- If `entry.userId`: delete from `debate_invitations` where `(debate_id, invited_user_id)` and delete from `debate_interests` where `(debate_id, user_id)` (covers both "accepted invitee" and "queued speaker" cases — kicks them out of the lobby).
- If `entry.email` (manual entry, no user yet): delete from `debate_invitations` where `(debate_id, invited_email)`.

Realtime already syncs `debate_participants`/lobby rows so the kicked user's `DebateLobbyPage` will lose its waiting hold; on next poll/realtime they fall back to spectator/preview.

## 2. Queued speaker avatar bubbles in both lobbies

In `DebateLobbyPage.tsx`, fetch and subscribe to:

- `debate_interests` rows with `role='queued_speaker'`
- `debate_invitations` rows with `status='accepted'`
join with `profiles(display_name, avatar_url)` and render a small `<QueuedSpeakers>` strip (avatar bubble + name + side chip + green pulse if their mic is in `mic_lobby`) above `MicLobby` for BOTH the host view and the waiting-invitee view. Same component, same data, no role gating.

## 3. Argument map draggable beyond the main panel

Convert `FloatingOverlay` from absolute-in-parent to a portal mounted on `document.body`, with `position: fixed`. Clamp drag/resize to the viewport (`window.innerWidth/innerHeight`) instead of the parent's `clientWidth/Height`. Adjust initial position to be relative to viewport. This lets the user drag the argument map over the sidebar, transcript pane, or anywhere on screen.

## 4. Live transcription shows in the main panel (camera off)

In `ParticipantSharedView.tsx` `bothOff` branch, currently `MessengerChat messages={chatMessages}` where `chatMessages` is built from `args` only. Merge `transcriptEntries.filter(e => e.is_final && e.subtopic === currentSubtopic.title)` into `chatMessages` (mapped to the same `{id, content, sideLabel, sideOrder, createdAt, isEdited:false}` shape, dedup against args by trimmed lowercase text), sorted by timestamp. Also render the current `interimText` as a translucent footer overlay above the composer so spoken-but-not-finalized words appear live, matching the camera-on overlay.

## 5 & 6. Pause buttons only pause/unpause; extend is pure +60s

The bug is that `resume_speaker_pause` RPC shifts `turn_started_at` forward by the pause duration, then realtime fires line 454 in `DebateRoomPage.tsx` which recomputes `timeLeft = full - elapsed`. If the local timer drifted from the server `turn_started_at` (because pause snapshotted a smaller `timeLeft` than the server reckons), the resume payload visually "resets" the timer to the server's value.

Replace shift-based pause with snapshot-based pause for both facilitator and speaker pauses:

a) Add migration: new column `debates.pause_remaining_seconds int`. New RPCs:

- `pause_debate(_debate_id)` / `resume_debate(_debate_id)` — sets/clears `paused_at` and snapshots/restores `pause_remaining_seconds` and `turn_started_at` so the resumed timer continues from exactly the seconds left at pause time.
- Rewrite `resume_speaker_pause` to use the same snapshot model instead of `make_interval` shifting.

   On resume, the RPC sets `turn_started_at = now() - (time_per_turn_seconds - pause_remaining_seconds) * interval '1 second'` and clears `paused_at` / `speaker_paused_at` + `pause_remaining_seconds`.

b) `usePauseControl.pause/resume` and `useSpeakerPause.pause/resume` call the new RPCs (single atomic UPDATE; no client-side time math; no double effects).

c) `DebateRoomPage` timer effect: keep the existing `paused_at || speaker_paused_at` gate, and on resume let the realtime payload re-derive `timeLeft` from the new `turn_started_at` (already wired at line 454).

d) Extend time stays pure: keeps current behavior of rolling `turn_started_at` back 60s and `setTimeLeft(t => t+60)`; never touches `paused_at`/`speaker_paused_at` (already true). Verify no resume side-effect was accidentally tied to extend.

This guarantees: pause freezes the visible clock; resume continues from that exact value; extend just adds 60s. No "reset to full time" on resume; facilitator resume reliably clears `paused_at`.

## Technical notes

Files touched:

- `src/pages/CreateDebatePage.tsx` (#1)
- `src/pages/DebateLobbyPage.tsx` + new `src/components/lobby/QueuedSpeakerBubbles.tsx` (#2)
- `src/components/debate/FloatingOverlay.tsx` (#3, portal + fixed positioning, viewport clamp)
- `src/components/debate/ParticipantSharedView.tsx` (#4, merge transcripts into `chatMessages`, add interim overlay to camera-off branch)
- New migration `supabase/migrations/<ts>_pause_snapshot.sql` (#5/#6)
- `src/hooks/usePauseControl.ts` and `src/hooks/useSpeakerPause.ts` (call new RPCs)

No UI/visual redesign — only behavioral fixes and one small bubble strip in the lobby.  
7. BONUS: the joined speakers never made it out of the lobby, still. explain to me what the problem is and how you're going to solve it then solve it. this is such a key part of the build.