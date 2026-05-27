# Debate Flow Hardening — All 14 Fixes, GOAL: COMPLETE v1 of DEBATE FEATURE READY FOR LAUNCH AND CONSUMER AND ENTERPISE CUSTOMERS

Implementation order is chosen so privacy/correctness lands first and risky state-machine consolidation lands last with the most surface area to test.

## Wave 1 — Privacy & speaker identity (🔴 critical)

**1. Off-turn speakers stop transmitting**

- In `DebateRoomPage.tsx`, extend the Deepgram `isActive` gate to also require `isMyTurn`.
- When `isMyTurn` flips false, force `setDeepgramActive(false)` and stop any local mic tracks the page owns.
- Acceptance: speaker A leaves mic toggle on, turn advances → Deepgram socket closes within 1s, no further transcript entries attributed to A's side during B's turn.

**5. End-turn-early stops local mic + Deepgram**

- In the `endTurnEarly` path, call `setDeepgramActive(false)` and stop tracks on `mediaStreamRef`.
- Same acceptance as #1 but triggered manually.

**12 (expanded). Default speaker identity**

- When the speaker hook initializes for a turn, default `currentSpeakerSide` to the participant's `side_id` label and `displayName` to `profiles.display_name`.
- Reuse `resolveSpeakerName` from `src/lib/liveNames.ts` for the name fallback chain.
- Remove the literal `"Speaker"` fallback in `flushStatement` — if side is still empty after defaulting, drop the entry and log a warning rather than write a malformed row.

## Wave 2 — Real speaker pause (🔴 #2 + 🟡 #13)

**2. Speaker pause actually pauses the debate**

- Add columns `speaker_paused_at timestamptz`, `speaker_pause_owner_id uuid`, `speaker_pause_used_turn_key text` to `debates` (migration).
- New hook `useSpeakerPause(debateId, currentTurnKey, isCurrentSpeaker)`:
  - `pause()` writes `speaker_paused_at = now()`, owner = `auth.uid()`, used key = current turn signature (`subtopic_index:turn:side_id`).
  - `resume()` clears `speaker_paused_at`, shifts `turn_started_at` forward by elapsed pause ms (server-side via RPC `resume_speaker_pause(debate_id)` to avoid client clock drift).
  - 30s safety auto-resume: server-trusted by computing `pauseEndsAt = speaker_paused_at + 30s`; client triggers `resume()` once `now() >= pauseEndsAt`. No `setTimeout` closures.
- While `speaker_paused_at` is set: halt Deepgram (gate added to `isActive`), preserve current mic mute state, and surface countdown beneath the existing speaker-pause IconCircleButton.
- One pause per turn enforced via `speaker_pause_used_turn_key` (toast if reused).
- Facilitator `paused_at` and speaker `speaker_paused_at` are independent — neither overrides the other; Deepgram requires both to be null to run.

**13. Pause-used persists across refresh**

- Covered by the column above; local-only `pauseUsedThisTurn` is removed.

## Wave 3 — Per-turn grading + state-machine cleanup (🔴 #3, 🟠 #6, #7, #4)

**3. Per-turn grade uses the just-finished turn index**

- Compute `prevTurn` (subtopic + turn + speaker side) **before** advancing, capture into a const, then pass that constant to the grade insert.

**6. Collapse `advanceTurn` and `completePrepPhaseAndAdvance**`

- Single function `advanceTurn({ skipPrep }: { skipPrep?: boolean })`. Prep-completion path calls it with `skipPrep: true`.

**7. `handleNextSubtopic` shares the completion tail**

- Extract round-summary + grade trigger into a helper invoked from both creator and non-creator paths.

**4. `enterPrepPhase` is idempotent**

- Short-circuit if `prep_phase_active` is already true (fresh fetch before write); rely on Postgres realtime + a `WHERE prep_phase_active = false` predicate on the update to avoid double-fire.

## Wave 4 — Cleanup + UX (🟠 #8–#11, #14)

**8. Remove dead imports** in `DebateRoomPage.tsx`: `NotebookOverlay`, `NotebookPen`, `MapIcon`, `ArgumentMapOverlay`.

**9. Mic double-prompt**

- Accept an optional pre-warmed `MediaStream` in `useDeepgramTranscription` via prop; if present, skip `getUserMedia`. Pass the lobby's stream from `takeHandoffStream()` into the hook.

**10. Persistence + realtime echo**

- Debounce `persistTranscriptEntries` to one flush per second.
- In the realtime subscription, ignore payloads whose `updated_at` matches the row this client just wrote (track last-written timestamp in a ref).

**11. Drop "Speaker" literal fallback** — handled in Wave 1 #12.

**14. Insights paywall server-trust**

- Add `isLive` boolean prop to `PerformanceInsightsToggle` and `FloatingIntelligence`. When `isLive && !sub.canUseLiveInsights`, open `PaywallModal` instead of rendering the panel. Server-side, the `trigger-deep-perf` edge function already validates tier; add the same check to `analyze-performance` if missing.

## Technical notes

- Migration is additive only (three new columns on `debates` + one RPC). No backfill needed; nulls mean "not paused / no pause used".
- All Deepgram gating consolidates into a single derived boolean in `DebateRoomPage`:
  ```ts
  const deepgramShouldRun =
    debate?.status === "live" &&
    userRole !== "spectator" &&
    isMyTurn &&
    deepgramActive &&
    !debate?.paused_at &&
    !debate?.speaker_paused_at;
  ```
- No changes to facilitator UI, AI prompts, or the edge `ai-facilitator` function.
- Smoke test per §2 release criteria on Desktop Chrome + iOS Safari before merging Wave 3.

## Files touched (estimate)

- `supabase/migrations/<new>.sql` (Wave 2)
- `src/hooks/useSpeakerPause.ts` (new)
- `src/hooks/useDeepgramTranscription.ts` (#1, #5, #9, #10, #11)
- `src/pages/DebateRoomPage.tsx` (#1, #3, #4, #5, #6, #7, #8, default identity, pause wiring)
- `src/components/debate/ParticipantSharedView.tsx` (countdown UI, pause icon wiring)
- `src/components/insights/PerformanceInsightsToggle.tsx`, `FloatingIntelligence.tsx` (#14)
- `supabase/functions/analyze-performance/index.ts` (#14 server check, if missing)

## Out of scope

- Facilitator-side UI changes (no audit signal found).
- Any change to the existing host pause (`usePauseControl`) — speaker pause is a new, separate axis.