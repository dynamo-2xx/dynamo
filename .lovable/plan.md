

## Plan: Fix auth redirect, host = Speaker 1, restructure live UI

### 1. Auth redirect after sign-in/sign-up
**Problem:** `LiveJoinPage` passes `?redirect=/live/join/CODE` to `/auth`, but `AuthPage` ignores it and always pushes to `/`.

**Fix:** In `src/pages/AuthPage.tsx`, read `redirect` from `useSearchParams()` and navigate there on successful sign-in / sign-up / Google OAuth instead of `/`. Validate it starts with `/` (no open-redirects).

### 2. Host always = Speaker 1
**Problem:** Per the screenshot, the host's own merged transcript labels them "Speaker 2." In multi-device mode the host runs `useDeviceTranscription` with a `speakerSlot` derived from local state — currently hardcoded or off-by-one.

**Fix:**
- In `LiveSessionPage.tsx`, when the host starts a multi-device session, immediately call `join_live_session` for the host too (or read back their participant row) and use the returned `speaker_slot` (which is `1` because they're first). Pass that exact slot into `useDeviceTranscription`.
- Seed `live_sessions.speaker_names` with `{ "1": "<host display_name>" }` so the merged transcript renders the host's real name, not "Speaker 2."
- Confirm `useMergedLiveTranscript` resolves labels via `speaker_names[slot]` first, falling back to `Speaker ${slot}`.

### 3. Restructure live UI like a Zoom call
Current layout (host, multi-device, recording): presence strip → VideoGrid → transcript → invite block (somewhere above).

**New layout (mobile-first, applies at current 833px viewport too):**

```text
┌──────────────────────────────────────────────┐
│ [back] ● Recording  title           [End]   │
├──────────────────────────────────────────────┤
│ ┌──────────────┐  ┌────────────────────────┐ │
│ │ [+ Invite ▾] │  │ presence avatar strip  │ │
│ └──────────────┘  └────────────────────────┘ │
├──────────────────────────────────────────────┤
│                                              │
│            VIDEO GRID (own space)            │
│         own + remote tiles + mic/cam         │
│                                              │
├──────────────────────────────────────────────┤
│            TRANSCRIPT (own space)            │
│             scrollable, below video          │
│                                              │
└──────────────────────────────────────────────┘
```

- **Video block**: dedicated section, not interleaved with transcript. Keep mic/cam toggles directly under it.
- **Transcript block**: separate scroll region beneath the video. Stops the current "video sandwiched in scroll" feel.
- **Invite control**: replace the existing always-visible JoinCodeCard with a compact `[+ Invite ▾]` button **pinned to the left of the presence strip**. Clicking it opens a `Popover` (anchored, not modal) showing the existing JoinCodeCard contents (code, copy, share, QR). Closes on outside click.
- Same restructure on `LiveJoinPage` recording phase: video on top in its own space, "Connected / mic active" status pill below — joiners don't get the invite button.

### Files

```text
EDIT src/pages/AuthPage.tsx                — honor ?redirect=/... after auth (email + Google)
EDIT src/pages/LiveSessionPage.tsx         — fix host slot via join RPC, seed speaker_names, restructure layout, wrap JoinCodeCard in Popover
EDIT src/pages/LiveJoinPage.tsx            — restructure recording phase (video block / status block)
EDIT src/components/live/PresenceList.tsx  — accept optional left-side slot for the Invite button (or compose in parent)
EDIT src/hooks/useMergedLiveTranscript.ts  — ensure speaker label resolution prefers session.speaker_names[slot]
```

No DB migrations. No edge function changes. WebRTC, Deepgram, analysis, RLS untouched.

### Confidence
- Auth redirect: **97%**
- Host = Speaker 1 via RPC slot + name seed: **93%**
- Layout restructure + Invite popover: **95%**

Overall: **~95%**.

