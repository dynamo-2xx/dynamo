# Debate launch, turn, transcript, and notebook fixes

## Desired outcome

- Host lobby shows the host plus every accepted/queued speaker waiting with a mic connection.
- When the host launches, all queued speakers are promoted into the live debate room as speakers on their chosen/assigned sides.
- Facilitator controls do not accidentally pause or freeze turns.
- Turns alternate side-to-side; no side gets two speaking turns in a row, including across subtopics.
- Live speech transcription appears in the visible transcript/main panel and feeds the argument map.
- Completed `/debate/:id` still has the notebook button at bottom-right.

## 1. Host lobby should show all joined speakers

**Files:**
- `src/pages/DebateLobbyPage.tsx`
- `src/components/lobby/MicLobby.tsx` if needed

`MicLobby` already reads connected rows from `mic_connections`, and `DebateLobbyPage` already passes `hideEmptySlots`, so the display logic is mostly in place.

I will fix the source of missing users by ensuring all accepted/queued speaker flows attach with side-based slot keys that the host lobby can resolve:

- accepted invitees and in-person queued speakers should write mic rows as `${sideId}:${userId}` instead of a generic `queued:${userId}` whenever a side is known.
- the host continues to use `host:${userId}`.
- `MicLobby.sideLabelFor()` will keep resolving side IDs into actual side labels and display “Host” for the host row.

This makes the lobby roster match the real waiting queue rather than showing only the host.

## 2. Carry accepted/queued speakers into live session on host launch

**Files:**
- `src/pages/DebateLobbyPage.tsx`
- `src/pages/JoinDebatePage.tsx` if the accepted-invite queue path needs normalization

The launch flow currently promotes only `debate_interests.role = 'queued_speaker'` into `debate_participants`. That misses some accepted invitation paths if they are only stored in `debate_invitations.status = 'accepted'` and not mirrored into `debate_interests`.

I will update `handleStart()` so launching a debate promotes both sources:

1. `debate_interests` rows with `role = 'queued_speaker'` and a `side_id`.
2. `debate_invitations` rows with `status = 'accepted'`, `invited_user_id`, and `side_id`.

Both sources will be merged/deduped by `user_id`, then upserted into `debate_participants` with:

```ts
{
  debate_id: id,
  user_id,
  side_id,
  participant_role: "speaker"
}
```

The existing `onConflict: "debate_id,user_id"` pattern remains so users are not duplicated. After status flips to `live`, the existing realtime + polling navigation sends waiting users into `/debate/:id`.

## 3. Extend time should add 1 minute without pausing/freezing

**File:**
- `src/pages/DebateRoomPage.tsx`

`handleExtendTime()` currently only increments local `timeLeft`, so other clients re-sync from unchanged `turn_started_at` and the extension can look broken or frozen.

I will make the extension authoritative by updating `debates.turn_started_at` backwards by 60 seconds. Every client then derives the same extra minute from the existing timer sync.

No `paused_at` or `speaker_paused_at` changes will happen in this path.

## 4. Top panel flips Speaking side / Listening side on click

**File:**
- `src/components/debate/ParticipantSharedView.tsx`

I will make the top-left side block clickable:

- default state: `SPEAKING` + active side label.
- clicked state: `LISTENING` + the other side label(s).
- clicking again toggles back.

This is display-only and will not affect turn state, mic state, or permissions.

## 5. Enforce alternating turns and fix timer starts

**File:**
- `src/pages/DebateRoomPage.tsx`

There are two turn-advance paths that reset the next subtopic to side 0. That can produce side A twice in a row when crossing a subtopic boundary.

I will update both advance paths so the side always advances from the current side:

- `advanceTurn()`
- `completePrepPhaseAndAdvance()`

When moving to a new subtopic, `current_turn` resets to 0, but `current_speaker_side_id` continues alternating from the side that just spoke.

I will also clear stale pause flags whenever a new turn starts:

```ts
paused_at: null,
speaker_paused_at: null,
speaker_pause_owner_id: null
```

This prevents a facilitator pause or speaker pause from carrying into the next turn and blocking the timer.

## 6. Live transcription must display in transcript/main panel and feed argument map

**Files:**
- `src/hooks/useDeepgramTranscription.ts`
- `src/pages/DebateRoomPage.tsx`
- `src/components/debate/ParticipantSharedView.tsx` if the transcript surface needs a stronger live feed

The hook already creates transcript entries and calls AI analysis, but persistence currently overwrites pieces of `debate_transcripts` through separate upserts:

- transcript-entry writes can omit `argument_map`
- argument-map writes can omit `transcript_entries`

That can cause live speech to exist transiently but not remain available to the main panel or argument map.

I will change persistence to fetch-and-merge before writing:

- transcript entries merge with existing `transcript_entries` by `id`.
- argument-map entries merge with existing `argument_map` by `id`.
- writes preserve both columns every time.

Then I will verify the `ParticipantSharedView` receives `transcriptEntries` and `argumentMap` and renders them in the live transcript/main-panel surfaces already wired from `DebateRoomPage`.

## 7. Completed debate needs notebook FAB

**File:**
- `src/pages/DebateRoomPage.tsx`

`RecordToolsMount` is currently rendered with `hideFab`, while the in-room notebook button disappears once `ParticipantSharedView` is not rendered for completed sessions.

I will make the FAB visible only after completion:

```tsx
hideFab={!isCompleted}
```

The existing `notebookOpen` state and transcript/subtopic props stay the same.

## Acceptance checks

- Host lobby shows host + all accepted/queued speakers with mic rows before launch.
- Host launch promotes accepted invitees and in-person queued speakers into `debate_participants` before setting the debate live.
- Waiting speakers automatically navigate into `/debate/:id` after launch.
- Extend time adds 60 seconds across clients without pausing.
- Top panel toggles between Speaking and Listening labels.
- Turns alternate continuously across subtopics.
- Timer starts on every new turn after pause/skip/advance.
- Live speech appears in the transcript/main panel and is retained in `debate_transcripts` along with the argument map.
- Completed debate route shows a bottom-right notebook button.