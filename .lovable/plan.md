

The user wants Online Live sessions to include peer audio + video (so participants hear/see each other), like the debate feature already does. Let me check what the debate feature uses.
<lov-tool-use id="toolu_vrtx_01Xx3eaquGRYhT57VaD5omW1" name="code--search_files" integration-id="code" data="{\"query\": \"getUserMedia|RTCPeerConnection|webrtc|simple-peer\", \"include_patterns\": \"src/**/*.ts,src/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016LFtiyHwYEQCW98aSk2SgG" name="code--search_files" integration-id="code" data="{\"query\": \"getUserMedia|RTCPeerConnection|webrtc|simple-peer|MediaStream\", \"include_patterns\": \"src/**/*.ts,src/**/*.tsx\"}">
</lov-tool-use>
The current debate room uses a local-only camera (no actual peer-to-peer streaming — note the comment "Remote camera would be managed via WebRTC in a real implementation"). So debate doesn't truly do remote video either. The user wants real video/audio between participants. I'll plan WebRTC mesh via Supabase Realtime signaling.

<lov-plan>

## Plan: Add live video + audio between participants in Online Live sessions

### Goal
On `/live/:id` (host) and `/live/join/:code` (joiners), every participant sees and hears every other participant — like a Zoom-style grid — without changing any other behavior (transcription, presence, analysis all keep working).

### Approach: WebRTC mesh, signaled through Supabase Realtime
A mesh works well for the small group sizes Live sessions target (≤ ~6 participants). No new backend service is needed — Supabase Realtime broadcast carries the SDP offers/answers/ICE candidates between devices.

```text
Device A ──┐         ┌── Device B
           ├─ Supabase Realtime (signaling channel: live-rtc-{sessionId})
Device C ──┘         └── Device D
       (each pair establishes a direct RTCPeerConnection for media)
```

Audio + video tracks flow peer-to-peer over WebRTC. Existing per-device Deepgram transcription stays exactly as is (it taps the same local mic stream).

### What gets built

**1. New hook `src/hooks/useLiveSessionRTC.ts`**
- Acquires local mic + camera once (`getUserMedia({video,audio}`).
- Opens a Supabase Realtime channel `live-rtc-{sessionId}` with the device's `device_id` as presence key.
- For each other participant present, runs the standard "polite peer" WebRTC handshake (offer / answer / ICE) via `channel.send({type:'broadcast', event:'signal', payload:{...}})`.
- Uses public Google STUN servers (`stun:stun.l.google.com:19302`) — sufficient for most networks; TURN can be added later if NAT traversal fails.
- Returns `{ localStream, remoteStreams: Map<deviceId, MediaStream>, toggleCamera, toggleMic, cameraOn, micOn }`.

**2. New component `src/components/live/VideoGrid.tsx`**
- Responsive grid: 1 col on mobile (`<640px`), 2 cols sm, 3 cols lg.
- Each tile = `<video autoPlay playsInline>` + name pill + mic-muted indicator.
- Local tile is muted (`muted` attr) to prevent echo; remote tiles play audio.
- 16:9 aspect ratio, rounded, monochrome border per existing brand tokens.

**3. Wire-in (no other behavior changes)**
- `src/pages/LiveSessionPage.tsx`: when `mode === 'multi_device'` and recording, render `<VideoGrid>` above the existing transcript panel. Pass `sessionId`, `deviceId`, `displayName`, host's `speaker_slot`.
- `src/pages/LiveJoinPage.tsx`: in the recording phase, replace the static avatar/emoji block with `<VideoGrid>` using the joiner's `sessionId`, `deviceId`, `displayName`, `speaker_slot`. Mic-active text stays.
- A small bottom bar with two buttons (camera toggle, mic toggle) — mic toggle only mutes the **outgoing video-call audio track**, NOT Deepgram (so transcription continues unaffected, matching how the existing debate room treats mic independently).

**4. Permissions & mobile**
- Camera+mic prompted only after the existing "Tap to join & start mic" gesture (already user-initiated, satisfies iOS).
- `playsInline` on every `<video>` for iOS Safari.
- Wake Lock already requested in join flow — kept.

### Files

```text
NEW src/hooks/useLiveSessionRTC.ts        — WebRTC mesh + Supabase signaling
NEW src/components/live/VideoGrid.tsx     — responsive video tile grid
EDIT src/pages/LiveSessionPage.tsx        — render VideoGrid in multi-device recording view
EDIT src/pages/LiveJoinPage.tsx           — render VideoGrid in joiner recording phase
```

No DB migrations. No edge function changes. Transcription, presence, analysis, RLS — all untouched.

### Confidence
- WebRTC mesh + Supabase signaling: **88%** (well-trodden pattern; main risk is symmetric-NAT users where STUN-only fails — those would need TURN later)
- Mobile camera+mic UX: **92%**
- Zero regression to transcription/presence: **96%**

Overall: **~90%**.

