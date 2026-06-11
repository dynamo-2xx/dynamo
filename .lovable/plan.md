# P2 — Retire the mic lobby, move voice-confirm in-room

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