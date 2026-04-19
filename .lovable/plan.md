

## Plan: Online Mode v1 — Multi-Device Live Sessions (mobile-first)

### Architecture

```text
HOST device (creator)              JOIN devices (each participant)
─────────────────────              ─────────────────────────────
- Creates session                  - Visits /live/join/:code
- Sees join code + QR              - Authenticates (or guest name)
- Sees presence list               - Picks display name + avatar
- Records own mic ──┐              - Records own mic ──┐
                    ▼                                  ▼
              Per-device Deepgram WS (one per device, speaker_id = device slot)
                    │                                  │
                    ▼                                  ▼
         Final entries written to live_session_entries (debounced)
                    │
                    ▼
         Realtime postgres_changes → all devices merge into ordered transcript
                    │
                    ▼
         Host runs the existing two-pass Gemini analysis on the merged stream
```

### Schema changes

```text
live_sessions:
  + join_code        text unique (auto-generated, 6 chars, like debates)
  + host_user_id     uuid (alias of created_by; kept for clarity in queries)

NEW live_session_entries:
  id uuid pk, session_id uuid, device_id text, user_id uuid null,
  speaker_slot int, speaker_name text, text text, words jsonb,
  client_ts timestamptz, created_at timestamptz
  RLS: SELECT if session is public OR user is host OR user is in live_session_participants
       INSERT if user is host OR row exists in live_session_participants for (session, user_id/device_id)

NEW live_session_participants:
  session_id uuid, device_id text, user_id uuid null, display_name text,
  avatar_url text null, speaker_slot int, joined_at timestamptz, last_seen_at timestamptz
  PK (session_id, device_id)
  RLS: SELECT if session visible; INSERT/UPDATE own device row by code; host can update/delete any
```

A SECURITY DEFINER RPC `join_live_session(_code, _device_id, _display_name, _avatar_url)` validates the code, assigns the next `speaker_slot`, upserts the participant row, and returns `{ session_id, speaker_slot }`. This avoids exposing the session id by code-guessing.

### Routes & files

```text
NEW src/pages/LiveJoinPage.tsx              — /live/join/:code mobile-first join flow
NEW src/components/live/JoinCodeCard.tsx    — host-side code + QR + share
NEW src/components/live/PresenceList.tsx    — avatar pills, live update
NEW src/hooks/useLiveSessionPresence.ts     — postgres_changes on live_session_participants + heartbeat
NEW src/hooks/useDeviceTranscription.ts     — per-device Deepgram WS, writes finals to live_session_entries
NEW src/hooks/useMergedLiveTranscript.ts    — host merges live_session_entries by client_ts into ordered list, feeds existing analysis
EDIT src/pages/LiveSessionPage.tsx          — when mode=multi_device: show JoinCodeCard + PresenceList; use merged transcript hook on host
EDIT src/App.tsx                            — add /live/join/:code route (public)
EDIT supabase/functions/deepgram-token/index.ts  — fix getClaims bug (use getUser) so token endpoint works for join devices too
```

### Mobile-first UI (designed at 375px width)

- **Host setup**: existing screen; when "Online" picked, after Start show a sticky bottom sheet with the 6-char code, a tap-to-copy bar, native share button, and a QR (using a tiny inline SVG QR encoder — no extra dep if we use a small util; otherwise add `qrcode` ~6kb).
- **Host recording**: same transcript layout, plus a horizontally scrollable presence strip at top (44px tall avatar pills with name + live mic-dot).
- **Join page (`/live/join/:code`)**:
  1. Full-screen code-confirm card ("Joining 'Standup'")
  2. Display name + emoji-avatar picker (uses profile if logged in)
  3. Big "Tap to start mic" button (required — iOS gesture)
  4. Recording view: own waveform, "you are Speaker N", floating "leave" button
- All chips/buttons ≥44px touch targets; uses existing minimal monochrome tokens.

### Audio & merge logic

- Each device opens its own Deepgram WS (`useDeviceTranscription`) keyed by a stable `device_id` (localStorage uuid).
- Only `is_final` results are persisted to `live_session_entries` with `client_ts = Date.now()` and assigned `speaker_slot`.
- Interim results are broadcast over a Supabase Realtime channel (`live:{sessionId}` broadcast event `interim`) so the host shows live subtitles per speaker without DB writes.
- Host's `useMergedLiveTranscript` subscribes to `postgres_changes` on `live_session_entries`, merges by `client_ts`, and feeds the existing two-pass analyzer (unchanged).

### iOS Safari handling (covered, not bulletproof)

- Mic init only after explicit tap (gesture requirement).
- `visibilitychange` listener pauses/resumes `AudioContext` and shows a "tap to resume" banner when backgrounded.
- Wake Lock API (`navigator.wakeLock.request('screen')`) on join devices while recording.

### Bug fix bundled

`deepgram-token` currently throws `userClient.auth.getClaims is not a function` (visible in logs). Replace with `userClient.auth.getUser(token)` so both host and join devices can fetch the key.

### Confidence

- Schema + RLS + join RPC: **95%**
- Join page + presence UI mobile: **94%**
- Per-device Deepgram + DB persistence: **92%**
- Merged transcript driving existing analysis: **90%**
- iOS background-mic resilience: **70%** (best-effort; full bulletproofing is out of v1 scope but UX gracefully recovers)
- Deepgram token fix: **98%**

Overall v1: **~90%**. Ships a complete, testable Online mode end-to-end.

