

## Understanding

Five distinct issues to fix in Live multi-device sessions:

1. **Persistent video tiles** — every connected participant should always have a tile, even with camera off (show avatar/initials placeholder). Tile only disappears when the participant actually leaves.
2. **Real names everywhere** — joiners are showing as "Speaker 2/3" instead of the display name they entered. Host's `speaker_names` map isn't being updated when joiners arrive, so transcripts also fall back to "Speaker N".
3. **Accurate presence list** — currently shows phantom speakers when host is alone. Stale `live_session_participants` rows must be culled aggressively, and the presence list must filter to only currently-active devices.
4. **Display name defaults + fallback chain** — on join: use entered name → profile `display_name` → `Speaker #` (numbered slot) as last resort. Apply consistently to presence, video tiles, and transcripts.
5. **Translucent transcript bubbles + avatar** — match the debate room argument-map/notebook style. Each entry shows the speaker's avatar inline; hovering expands the avatar and reveals the display name in a small label.

## Investigation needed (during implementation)

- `useLiveSessionRTC.ts` — how `remotePeers` is shaped; need to merge with presence so tiles exist before/after a stream arrives.
- `useLiveSessionPresence.ts` — confirm the heartbeat threshold and stale-row filter; tighten to ~15s.
- `useMergedLiveTranscript.ts` — verify it joins entries with `live_session_participants.display_name` (not just `speaker_names` jsonb).
- `LiveThreadView` / live transcript card component — current markup, to swap in translucent bubble + avatar.
- `LiveJoinPage.tsx` — ensure joiner submits a real display name (prefill from profile if signed in).

## Plan

### 1. Always-present video tiles, identity-keyed
- Drive the `VideoGrid` from a **merged participant list** (presence rows ∪ self), not from `remotePeers` alone.
- Each tile is keyed by `device_id`. Tile renders:
  - Live `<video>` when a stream + cameraOn is true
  - Otherwise an avatar circle (profile `avatar_url` or initials of display name)
  - Mic-muted / cam-off badges on the tile (bottom-right)
- Tile disappears only when the participant's presence row is gone (heartbeat lapsed > 15s **or** explicit leave on unmount).
- Add a `beforeunload` + cleanup effect that deletes the joiner's `live_session_participants` row so leaves are immediate.

### 2. Display name propagation (joiner → host → transcripts)
- `LiveJoinPage`: prefill the join form's name field from the user's profile `display_name`. Require non-empty before allowing join.
- `join_live_session` already stores `display_name` on the participant row — good. Use that as the source of truth everywhere.
- **Update `live_sessions.speaker_names`** automatically whenever a new participant joins or changes name:
  - Host page subscribes to `live_session_participants` realtime changes.
  - On any insert/update, host merges `{ [speaker_slot]: display_name }` into `live_sessions.speaker_names` (host has UPDATE permission).
- `useMergedLiveTranscript`: resolution order for the label =
  1. `live_session_participants.display_name` for that `device_id`
  2. `live_sessions.speaker_names[slot]`
  3. `Speaker {slot}` fallback

### 3. Accurate presence (no phantom speakers)
- Tighten heartbeat: client pings every 5s; server considers anything older than 15s stale.
- `useLiveSessionPresence`: filter out rows where `last_seen_at < now - 15s` on the client too (don't trust the table alone).
- `join_live_session` already purges stale rows on entry — extend the same purge logic to a small periodic cleanup triggered by the host page (every 20s, host-only).
- Result: if only the host is heartbeating, only the host shows up.

### 4. Display-name fallback chain
Single helper `resolveSpeakerName({ entered, profileName, slot })`:
```
entered?.trim() || profileName?.trim() || `Speaker ${slot}`
```
Used on:
- `LiveJoinPage` submit
- `LiveSessionPage` host self-registration
- Presence list rendering
- Video tile labels
- Transcript bubble labels

### 5. Translucent transcript bubbles + hoverable avatars
- New component `LiveTranscriptBubble` (or refactor existing) styled to match argument-map/notebook:
  - `bg-background/70 backdrop-blur-xl border border-foreground/10 rounded-2xl`
  - Soft shadow, subtle inner padding, body text in DM Sans
- Layout per entry: small circular avatar (28px) on the left, message text on the right.
- Hover behavior on the avatar:
  - Expands smoothly (28 → 44px) via `transition-all`
  - Reveals a small chip label with the display name to the right of the avatar (fade/slide in)
  - Pure CSS (`group-hover:`) — no JS state needed
- Apply to both `LiveSessionPage` host transcript and `LiveJoinPage` joiner transcript.

### Files to edit

```text
src/hooks/useLiveSessionPresence.ts        — 15s stale filter, faster heartbeat
src/hooks/useLiveSessionRTC.ts             — expose merged tile list keyed by device_id
src/hooks/useMergedLiveTranscript.ts       — name resolution order + participant join
src/pages/LiveSessionPage.tsx              — sync speaker_names on participant changes, periodic stale purge, wire new bubbles, persistent tiles
src/pages/LiveJoinPage.tsx                 — prefill name from profile, leave-on-unmount, persistent tiles, new bubbles
src/components/live/VideoGrid.tsx          — render placeholder tile when no stream / cam off
src/components/live/PresenceList.tsx       — strict filter on live participants only
src/components/live/LiveTranscriptBubble.tsx (NEW) — translucent bubble + hoverable avatar
src/lib/liveNames.ts (NEW)                 — resolveSpeakerName helper
```

No new tables. No edge function changes. RLS untouched.

### Verification checklist
1. Host alone → presence list shows only host; one video tile (host).
2. Joiner enters "Alex" → host sees a second tile labeled "Alex" instantly; transcripts attribute lines to "Alex," not "Speaker 2."
3. Joiner turns camera off → tile stays, shows avatar + "Camera off" badge.
4. Joiner closes the tab → tile and presence chip disappear within ~15s (or instantly via unmount).
5. Hover any avatar in the transcript → it grows and the display name chip appears.
6. Joiner without a typed name + no profile name → shown as "Speaker 2" everywhere consistently.

### Confidence
- Persistent tiles + identity model: **94%**
- Name propagation via realtime + speaker_names sync: **92%**
- Stale-row culling / accurate presence: **93%**
- Translucent bubbles + hover avatar: **97%**

Overall: **~94%**. The architecture is straightforward; the only moderate risk is host-side write-back of `speaker_names` racing with concurrent transcript inserts, which we handle via fetch-and-merge (already a project-wide pattern).

