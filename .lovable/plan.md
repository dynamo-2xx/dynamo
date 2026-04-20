

## Plan: Fix mic-after-unmute + lingering tile bugs

### Bug 1 — Host mic dies after unmute
**Root cause:** Two independent mic captures running:
- `useLiveSessionRTC` calls `getUserMedia({audio,video})` for peer streaming
- `useDeviceTranscription` calls `getUserMedia({audio})` for Deepgram

When RTC's `toggleMic` does `track.stop()` + new `getUserMedia({audio})`, browsers can revoke/disturb the other concurrent capture. Also, the new track is only piped to RTC senders, never to the Deepgram `ScriptProcessor` graph (which is still bound to the original — now-stopped — track).

**Fix:** Make RTC the single owner of the mic, and have transcription consume RTC's stream.
1. Add `getAudioTrack()` accessor + a `localStream` that always reflects current tracks to `useLiveSessionRTC`.
2. Refactor `useDeviceTranscription` to accept an optional `externalStream: MediaStream | null` prop. When provided, skip `getUserMedia` entirely and build the Web Audio graph from the external stream.
3. Rebuild the Deepgram audio graph whenever the active audio track changes (listen for `addtrack`/`removetrack` on the stream, OR re-run effect on a `streamVersion` counter that bumps in `toggleMic`).
4. In `LiveSessionPage`, pass `rtc.localStream` to `useDeviceTranscription` for multi-device mode.

### Bug 2 — Tile remains after user leaves
**Root cause:** `VideoGrid` builds `remoteTiles` from the presence list (DB rows), which lingers up to 15s after a tab close (and forever on best-effort `beforeunload` failures). RTC peer disconnect already cleans `remotePeers`, but the presence row keeps the tile alive with an avatar fallback.

**Fix:** Tighten leave detection to two complementary signals:
1. **RTC presence channel disconnect** (already tracked in `useLiveSessionRTC` via Supabase channel `presence` events) — when a `deviceId` drops from the RTC presence state, treat them as gone *immediately*.
2. In `VideoGrid`, only render remote tiles for participants who are EITHER in `remotePeers` OR present in the RTC presence list within the last ~3s. Drop the "show every DB participant" behavior for the live tile grid.
3. Reduce stale cutoff for `useLiveSessionPresence` from 15s → 8s and heartbeat from 5s → 3s so DB cleanup catches up faster.
4. Add `pagehide` + `visibilitychange=hidden` listeners alongside `beforeunload` (more reliable on mobile/Safari) that call the delete.
5. Add a server-side cleanup: a Postgres function `purge_stale_live_participants(_session_id)` invoked from the heartbeat RPC that deletes rows older than 10s, so the DB self-heals.

### Files to touch
```
src/hooks/useLiveSessionRTC.ts        — expose live audio track + version bump on toggleMic
src/hooks/useDeviceTranscription.ts   — accept externalStream; rebuild graph on track change
src/hooks/useLiveSessionPresence.ts   — 8s cutoff, 3s heartbeat
src/pages/LiveSessionPage.tsx         — pass rtc.localStream into useDeviceTranscription;
                                        add pagehide/visibilitychange leave hooks
src/pages/LiveJoinPage.tsx            — same leave hooks
src/components/live/VideoGrid.tsx     — only show tiles for active RTC peers (intersect with presence)
```

### Migration
One small migration adding `purge_stale_live_participants` and updating `live_session_heartbeat` to call it.

### Verification
1. Mute/unmute the host mic 5×; words spoken after each unmute appear in the transcript.
2. Guest closes tab → host's tile for guest disappears within ≤3s (RTC signal) and DB row purges within ≤10s.
3. Guest navigates away via in-app nav → tile disappears immediately.
4. Both users' camera/mic toggles continue to only affect their own tile.

### Confidence
- Bug 1 fix (single mic owner): **92%**
- Bug 2 fix (intersect peers + presence + faster cleanup): **94%**
- Server-side purge migration: **97%**

Overall: **~93%**.

