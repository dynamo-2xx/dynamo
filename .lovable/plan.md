## 1. User story: /debate/:id/lobby (Mic-Prep)

**As a host arriving at the debate lobby**, I want a single pre-session gate that lets me confirm my mic, see who else has connected, and start the room when ready — without being blocked by stragglers.

Flow:

1. Host lands on `/debate/:id/lobby` after creating or scheduling a debate (or from "Start" on the preview).
2. Header shows topic, format badge, and a countdown if `scheduled_at` is set.
3. **Join panel** (existing `InPersonJoinPanel`): join code, QR, "Project" button.   
[Message from me: verify project button, join code, qr code can actually connect others to the debate session. As of now, none of these options work. Wire real buttons, not fake ones.]
4. **Seat grid**: one bubble per `(side × seat)`. State per bubble: gray = empty, green pulse = connected & mic ready, red = mic failed, blue ring = queued-but-not-yet-mic-ready (see §3).
5. Host's own mic test runs inline (waveform + device picker + mute).
6. **Start button** enables once ≥1 mic is connected (today's gate).
7. **Force-start button** (new) — always visible to the owner. Clicking transitions the debate to `live` immediately; un-ready participants keep their Mic-Prep running in the background and pop into the room when their mic comes online (same code path as a mid-session reconnect).
8. Solo host with mic ready → auto-advance (lobby acts as a loading screen).
9. Overdue banner (already implemented, +15 min) lets the host cancel.

**As a queued / invited participant** on the same page: identical layout minus Start; I see my own mic test, the live seat grid, and a "Waiting for host…" status. If the host force-starts before my mic is ready, I'm dropped into the room with a "Tap to enable mic" toast.

---

## 2. Force-start (missing today)

Add an owner-only "Force start" button in `DebateLobbyPage` next to the gated "Start debate" button:

- Same `update({ status: 'live', started_at: now })` mutation as Start — the only difference is removing the `minConnected` gate.
- Confirm dialog: "Start without waiting for ready mics? Late participants will join when their mic connects."
- Surface in `MicLobby` via a new optional `onForceStart` prop so CMM/Live can adopt it later.

---

## 3. "Queue to join" from /debate/:id/preview

Add a third action to the `Interested?` popover on `DebateScheduledPreviewPage` (alongside "Message the publisher" and "Notify me when it starts"):

**"Queue to join as speaker"** → opens a small side picker (reuses `sides`), then inserts a `debate_participants` row with `participant_role = 'queued_speaker'` (new role) and the chosen `side_id`. After insert, navigate the user to `/debate/:id/lobby` where they wait with the host.

Host-side surfacing (no new tab needed — reuses the existing **Invite Speakers** block in `CreateDebatePage`):

- The realtime subscription on `debate_participants` already exists (lines 286–313). Extend the merge so `participant_role = 'queued_speaker'` rows render as avatar chips in the Invite Speakers list with a small "Queued" badge and a green pulse when their mic connects.
- Host actions on a queued chip: **Accept** (promote to `speaker`, assigns the chosen `side_id`) or **Dismiss** (delete row). Acceptance gives the user a seat in the lobby grid.
- Only the host can start the session — queued users in the lobby see "Waiting for host…".

Schema: add `'queued_speaker'` to the allowed values of `debate_participants.participant_role` (currently a text check or enum — migration confirms which). RLS: queued users insert their own row scoped to `auth.uid()`; host can update/delete any row on debates they created (existing policy likely already covers this — verify in migration).

---

## 4. Move "Invite Now" into Invite Speakers

The standalone "Invite Now" CTA currently lives outside the Invite Speakers block in `CreateDebatePage` (and/or on the preview page). Action:

- Delete the standalone button.
- Place a single "Invite Now" button inside the **Invite Speakers** card (`CreateDebatePage.tsx` ~line 1391), to the right of the username input / chips list, so all invite controls live in one place.
- Behavior unchanged: sends pending email invites + finalizes username invites for `invitedEntries`.

---

## Technical summary

**Files**

- `src/pages/DebateLobbyPage.tsx` — add Force-start button + confirm dialog.
- `src/components/lobby/MicLobby.tsx` — optional `onForceStart` prop + render.
- `src/pages/DebateScheduledPreviewPage.tsx` — add "Queue to join" action to Interested popover with side-picker substep.
- `src/pages/CreateDebatePage.tsx` — render queued participants as chips in Invite Speakers; add Accept/Dismiss; relocate "Invite Now" into this block.
- New migration — extend `participant_role` to allow `queued_speaker`; verify RLS for host accept/dismiss.

**Out of scope** (call out, don't build now): full Mic-Prep refactor that merges Debate/CMM/Live lobby pages — keep as a follow-up tracked in `mem://features/mic-prep`.  
What does this mean? Give me a user story.  
