# P3 — Debate "Join when it starts" (replace remaining lobby UX)

P0, P1, P2 shipped. P3 finishes the lobby retirement by removing the *navigate-into-a-waiting-room* step for invitees.

## What changes for the user

**Today (post-P2):** Tapping a Join link drops the user into the room while it's still in `draft`/`scheduled` — they see the thin in-room lobby and have to sit on that tab until the host hits Start. If they close the tab they miss it.

**After P3:** Tapping Join writes them onto the queue and returns them to wherever they were, with a toast: *"You're queued for [topic]. We'll notify you when it starts."* A small persistent strip in the global layout reminds them they're queued and offers Leave. When the host flips the debate to `live`, the existing in-app `session_started` notification + a Web Push notification fire, both with an **ENTER** button that drops them into the room.

## Scope

1. **`JoinDebatePage` / `JoinCmmPage` / `LiveJoinPage`** — on successful queue/claim, do NOT navigate to the room while status≠`live`. Toast + `navigate(-1)` (or `/`). If status is already `live`, navigate straight in.
2. **New** `src/components/QueuedSessionStrip.tsx` — mounted in `AppLayout`. Subscribes to the user's open queue rows across `debate_participants` (where status is draft/scheduled). Renders a slim bottom strip per active queue: topic + "Leave" + auto-disappears on status→live (which triggers the existing toast/notification).
3. **`DebateRoomPage` start handler** — after the `promote_lobby_to_participants` RPC, invoke `dispatch-debate-start-push` edge function so Web Push fires alongside the in-app notification. Same for CMM/Live start handlers if they have queued users.
4. **Owner guard** — when the host clicks Start on a different live session than where they currently are, no-op; we don't navigate them mid-session. (Already implicitly true; just make sure we don't double-fire.)

## Out of scope

- Re-architecting `dispatch-debate-start-push` itself; it already exists and is wired to `debate_interests`/invitations. We just call it.
- Adding a queue strip for live/CMM separately — same component handles all three kinds.
- Per-device push opt-in flow (already covered by existing push subscription onboarding).

## Files

- **New** `src/components/QueuedSessionStrip.tsx`
- **Edit** `src/components/AppLayout.tsx` — mount the strip above the bottom nav.
- **Edit** `src/pages/JoinDebatePage.tsx`, `JoinCmmPage.tsx`, `LiveJoinPage.tsx` — on queue success, toast + go back instead of pushing into the room.
- **Edit** `src/pages/DebateRoomPage.tsx` — after start, call `supabase.functions.invoke("dispatch-debate-start-push", { body: { debate_id } })`.

---

## Done — P2: Retire the mic lobby, move voice-confirm in-room

## What changes for the user

**Today:** Before a debate/live/CMM starts, every participant lands on a *lobby page* that asks them to claim a slot and confirm their mic is working. Once everyone in the lobby is "ready", the session begins.

**After P2:** No lobby page. Participants go straight into the room (debate / live / CMM). The mic button in the top bar gains a small green "✓ voice confirmed" dot once their voice has been picked up. The host sees who's confirmed in the participant list; they can start the session whenever they want (auto-start when everyone confirms is optional, off by default for now).

## Why

The lobby is the #1 drop-off point — people land on it, get confused, close the tab. Voice-confirm belongs *with* the mic UI, not on a separate page.

## Scope

### Delete (or stop rendering)

- `src/pages/DebateLobbyPage.tsx`, `LiveLobbyPage.tsx`, `CmmLobbyPage.tsx` — replace with direct redirect to the room.
- `src/components/lobby/MicLobby.tsx`, `LobbySlotRow.tsx` — remove imports; component file kept for one release in case we need to roll back, then deleted.
- `src/hooks/useMicLobbyAttachment.ts` — replaced by an in-room hook (see below).

### Keep (and reuse)

- `src/hooks/useMicLobby.ts` — the underlying `mic_connections` table tracking + realtime channel is reused; only renamed to `useMicPresence` and surfaced inside the room.
- `src/hooks/useMicPolicy.ts` — per-format mic enforcement is unchanged.

### New

- `src/components/live/MicConfirmButton.tsx` — wraps the existing mic toggle in the top bar; adds:
  - a 6px green dot in the bottom-right when `voice_confirmed_at` is set on the user's `mic_connections` row;
  - first time the user's RMS crosses the existing speech threshold for ≥500ms, write `voice_confirmed_at = now()` (single round trip, idempotent).
- `src/components/live/ParticipantConfirmList.tsx` — small sidebar list for the host: pill per participant with name + check / spinner. Mounted only for `role = publisher`.

### Routing

- `/debate/:id/lobby` → redirect to `/debate/:id` (server-side via `<Navigate replace>`).
- `/live/:id/lobby` → `/live/:id`. Same for CMM.
- Join links (`JoinDebatePage`, `JoinCmmPage`, `LiveJoinPage`) drop the `useMicLobbyAttachment` call; attachment moves to the room mount.

## Migration

```sql
ALTER TABLE public.mic_connections
  ADD COLUMN IF NOT EXISTS voice_confirmed_at timestamptz;
```

No new table, no new RLS — existing `mic_connections` policies already gate to the participant.

## Out of scope (P3 / later)

- Auto-start when everyone confirmed. This is a trait of the mic-lobby. Voice-confirmation will no longer have any effect or influence on how a session starts. It's simply something that the user will manage independently and naturally. Force-start is retired along with it.
- Diarization beyond the single-speaker confirm signal.
- Reworking host "start session" button — still manual.

## Files

- **Delete imports of** `MicLobby` from `DebateLobbyPage`, `LiveLobbyPage`, `CmmLobbyPage`; replace each page body with `<Navigate to="/<kind>/:id" replace />`.
- **Edit** `JoinDebatePage`, `JoinCmmPage`, `LiveJoinPage`: remove `useMicLobbyAttachment`; on success, navigate straight to the room.
- **Edit** `DebateRoomPage`, `LiveSessionPage`, `CmmRoomPage` (if exists): mount `<MicConfirmButton>` in the top bar slot where mic toggle lives today; mount `<ParticipantConfirmList>` in the host sidebar.
- **New** `src/components/live/MicConfirmButton.tsx`, `src/components/live/ParticipantConfirmList.tsx`.
- **Rename** `useMicLobby` → `useMicPresence` (keep export alias for one release).
- **Migration** adding `voice_confirmed_at` to `mic_connections`.
- **Update** `.lovable/plan.md`.

Approve and I'll ship it in this order: migration → new components → wire rooms → strip lobby pages → delete dead code.