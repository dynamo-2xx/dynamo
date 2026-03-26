

# Fix: Simultaneous Prep Windows with Manual Exit

## Problem
1. The prep overlay only appears for the debate creator's side — the invitee never sees their prep window because `enterPrepPhase` role assignment and `prepStartedAt` are only set locally without syncing via realtime to the other participant.
2. `handlePrepReady` immediately calls `advanceTurn()` when ONE side finishes — the debate should only continue when BOTH sides have exited.
3. There's no "I'm Ready" button to exit early; users must wait for the timer.

## Solution

### 1. Database: Track per-side readiness
Add two columns to `debates` via migration:
- `prep_side1_ready` (boolean, default false)
- `prep_side2_ready` (boolean, default false)

Reset both to `false` when entering prep phase; set the relevant one to `true` when a participant clicks "I'm Ready" or their timer expires.

### 2. `PrepPhaseOverlay.tsx` — Add "I'm Ready" button
- Add a prominent "I'm Ready" button on both the incoming (after selecting time + during countdown) and outgoing (review) views.
- Clicking it calls `onReady()` immediately, regardless of remaining time.
- The button replaces the auto-advance on timer expiry — `onReady` is called either by button click or timer reaching zero, whichever comes first.

### 3. `DebateRoomPage.tsx` — Sync both sides via realtime
**Entering prep phase:**
- Both participants detect the turn ending and set their local `prepPhaseRole`.
- The turn-ending participant writes `prep_phase_active = true`, `prep_side1_ready = false`, `prep_side2_ready = false` to the DB.
- The other participant picks up `prep_phase_active = true` via the existing realtime subscription and enters prep phase locally if they haven't already.

**Marking ready:**
- `handlePrepReady` no longer calls `advanceTurn()` directly. Instead, it sets `prep_side1_ready` or `prep_side2_ready` to `true` on the debate record (based on which side the user is on).
- A realtime listener watches for changes: when BOTH `prep_side1_ready` AND `prep_side2_ready` are `true`, THEN clear the prep phase and call `advanceTurn()`.

**Flow:**
```text
Turn ends
  → Both sides enter prep phase (synced via DB flag)
  → Incoming speaker: picks time, prepares, clicks "I'm Ready" or timer expires
  → Outgoing speaker: reviews summary, clicks "I'm Ready" or timer expires
  → Each side sets their ready flag in DB
  → When both flags are true → clear prep phase → advance turn
```

## Files to Change

| File | Change |
|------|--------|
| Migration SQL | Add `prep_side1_ready`, `prep_side2_ready` to `debates` |
| `PrepPhaseOverlay.tsx` | Add "I'm Ready" button to both incoming and outgoing views |
| `DebateRoomPage.tsx` | Sync prep phase via realtime; track per-side readiness; only advance when both ready |

