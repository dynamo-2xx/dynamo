

# Fix "I'm Ready" Button in Prep Phase

## Changes (1 file only: `src/pages/DebateRoomPage.tsx`)

### Fix 1: Race condition in realtime handler (lines 280-290)
Move the `bothReady` check **before** the block that clears `prepPhaseRole`. Currently at line 280, when `prep_phase_active` becomes `false`, the code clears `prepPhaseRoleRef` immediately — then the `bothReady` check at line 288 fails because the role is already `null`.

**New order:**
1. Check `bothReady` first (while `prepPhaseRoleRef` is still set)
2. Then clear local prep state when `prep_phase_active` is `false`

### Fix 2: Add `await` + error handling to `handlePrepReady` (line 596)
The Supabase `.update()` call is fire-and-forget. Make the callback `async`, `await` the result, check for errors, and show a toast on failure so the user can retry.

### Fix 3: No other changes
No changes to `PrepPhaseOverlay.tsx`, `completePrepPhaseAndAdvance`, or any other file.

