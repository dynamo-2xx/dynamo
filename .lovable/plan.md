
## Plan

### What’s actually broken
1. **Mic button** only toggles the WebRTC call audio in `useLiveSessionRTC`.  
   The transcript is still being captured by a separate mic stream inside `useDeviceTranscription`, so speech keeps getting recorded.

2. **Camera button** only hides/disables the preview track in the video grid path.  
   It does not fully stop the camera capture lifecycle, and it does not control transcription at all.

3. **Host still appears as Speaker 2** because slot assignment is based on `live_session_participants`, and stale participant rows / reused device joins can leave slot 1 occupied. The host page currently trusts whatever row exists for the current `deviceId`.

### Fix approach

#### 1) Make mic/camera toggles control the real capture source
Refactor Online mode so the call UI and transcription share one media-control source instead of opening unrelated streams.

- Update `useLiveSessionRTC` so:
  - **Mic off** fully disables the local audio capture for the session:
    - stop/remove the active audio track
    - expose `micOn = false`
    - provide a way to re-request mic **directly from the button click**
  - **Camera off** fully disables camera capture:
    - stop/remove the active video track
    - replace/remove the sender track on peer connections
    - restore only from a direct click handler

- Update `useDeviceTranscription` so it no longer independently owns a permanent hidden mic path.
  - It should accept either:
    - a shared audio stream/track from the RTC/media layer, or
    - an explicit `isMicEnabled` gate that hard-pauses sending audio and suppresses transcript writes/interim updates.
  - When mic is off, Deepgram input must stop and no new transcript rows should be inserted.

Result: the UI button and the actual recording state finally match.

#### 2) Fix host speaker slot deterministically
The host should not “discover” their slot from whatever participant row happens to exist.

- On host session start/load, explicitly ensure the host has the canonical participant row for the current device.
- If the current user is the session creator, force transcript display to use the host’s assigned slot from the authoritative participant record.
- Add a backend fix so `join_live_session` prefers/reuses the host row correctly and does not let stale rows keep slot 1 forever.
- Clean up stale participant handling so disconnected old devices don’t permanently steal early slots.

Result: if you are the host and only person present, you show as **Speaker 1**.

### Files to update
- `src/hooks/useLiveSessionRTC.ts` — real media enable/disable, track stop/restart, peer sender replacement
- `src/hooks/useDeviceTranscription.ts` — stop separate hidden recording path; bind to actual mic-enabled state/shared stream
- `src/pages/LiveSessionPage.tsx` — host slot resolution and wiring transcript capture to real media state
- `src/pages/LiveJoinPage.tsx` — same media-control wiring for joiners
- `supabase/migrations/...` — fix participant slot allocation / stale host-slot behavior in `join_live_session`

### Small related cleanup
- `src/components/live/JoinCodeCard.tsx` should be wrapped with `forwardRef` or wrapped in a normal container in the popover, to remove the current ref warning seen in console.

### What I’ll verify after implementation
1. Mic off: no one hears you **and** no new transcript text is created.
2. Mic on again: permission/restart works from the button.
3. Camera off: video track truly stops, not just hides.
4. Camera on again: feed resumes correctly.
5. Host alone in a fresh session: shown as **Speaker 1** everywhere.
6. Host with joiners: each device keeps the correct speaker slot.

### Confidence
High. The media issue is clearly caused by split capture paths, and the speaker issue is clearly tied to participant-slot persistence rather than transcript rendering alone.
