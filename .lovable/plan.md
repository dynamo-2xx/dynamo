# Wave 5 — Happy-path & control-panel fixes  🟢 shipped

Implemented in this order so the most user-visible breakage lands first and the riskiest AI-prompt work lands last with the most room to test.

Also save a new core memory rule:
> **Reliability bar:** Build with the intent of creating a tool with an exceptionally reliable, seamless experience ready for consumers and enterprise customers.

Written to `mem://preferences/reliability-bar` and added as a one-liner to `mem://index.md` Core.

---

## #16 — Speaker pause: resume, auto-resume, frozen turn clock

**Current incorrect state**
- Resume button is wired but the RPC clears `speaker_paused_at` without the client re-rendering reliably (state stays "paused" in UI).
- 30s auto-resume only fires if `canControl` is true AND `state.speaker_pause_owner_id === ownerId`; on reload `ownerId` resolves a tick late so the guard fails silently and the pause never lifts.
- Turn timer keeps counting down because `turn_started_at` is not shifted forward on resume in every path.

**Desired**
- Resume button instantly clears pause for everyone in the room.
- If nobody resumes, 30s auto-resume fires deterministically.
- During pause the turn clock visibly freezes (countdown frozen on all clients); on resume, `turn_started_at` is shifted forward by the pause duration so no time is lost.

**Fix**
- `useSpeakerPause`: drop the `canControl` requirement from the auto-resume branch; let any client whose `ownerId` matches OR whose `canControl` is true after a 5s grace fire the RPC, so the room never stalls.
- Audit `resume_speaker_pause` RPC: confirm it both clears the 3 pause columns AND updates `turn_started_at = turn_started_at + (now() - speaker_paused_at)` in one statement. If missing, add it.
- In the turn-timer hook/component, subtract elapsed pause when `speaker_paused_at` is non-null so the visible countdown freezes immediately (don't wait for `turn_started_at` to update on resume).

## #18 — Non-speaker loses entire control panel

**Current incorrect state**
- The control panel (mic, camera, notebook, argument map, pause) is conditionally rendered only when `isMyTurn`, so non-speakers see a blank toolbar.

**Desired**
- Both speaker and non-speaker always see the full control panel. Buttons gate per-feature:
  - Mic toggle + speaker-pause: enabled only when `isMyTurn`.
  - Camera, notebook, argument map, end-turn-early (where applicable): enabled for both.

**Fix**
- In `DebateRoomPage.tsx` (and `ParticipantSharedView.tsx` if it owns the toolbar), remove the outer `isMyTurn` conditional and replace with per-button `disabled={!isMyTurn}` only on mic + pause. Camera/notebook/argument map render unconditionally.

## #19 — Remove dead "edit threads" tab; add inline bubble edit

**Current incorrect state**
- A top tab/bar above the argument map + notebook does nothing.
- Argument-map bubbles have no edit affordance, so the prep-window "edit your AI-generated stance" never actually lands.

**Desired**
- Remove the dead tab.
- Each argument-map bubble shows a pencil icon during the prep window. Clicking it opens an inline editor.
- Once edited, the bubble shows an "edited" chip.
- Any viewer can tap the chip to revert to the AI original. Both `original_text` and `edited_text` are stored so the revert is non-destructive.

**Fix**
- Delete the dead tab JSX + state from the argument-map host.
- Migration: add `original_text text` and `edited_text text` to the argument-map node table (need to confirm table name during build — likely `debate_arguments` or similar).
- Add pencil → inline `<textarea>` → save flow on each bubble, gated by `debate.prep_phase_active === true` for the editor, but the "edited" chip and revert action visible always.

## #17 — Threaded record quality

**Current incorrect state**
- Live room shows one subtopic split into 4 sibling threads instead of one nested tree.
- Post-session archive shows multiple threads with identical titles (e.g. two "Contest …") and drops the per-statement tag chips.

**Desired**
- AI threader groups by argumentative relationship: a quote / stake / evidence becomes a child of its parent claim, not a sibling thread.
- Threads with identical titles get merged into one (preferring the earliest by timestamp).
- Per-statement tag chips persist into the post-session archive renderer.

**Fix**
- `supabase/functions/ai-facilitator/index.ts`: update the threading prompt to explicitly forbid creating a new top-level thread when a statement is a sub-move (quote/stake/evidence/counter-evidence) of an existing one. Provide 1-shot examples. Return `parent_thread_id` and `thread_role` consistently.
- Add a server-side merge pass: when two threads in the same subtopic have identical normalized titles, fold the later one's entries into the earlier one's `thread_id`.
- In the archive renderer (`LiveThreadView` + the post-session counterpart), pass through `tags` from the transcript entry to `TranscriptCard` and render the chip row.

## #15 — Prompt-template `/create` invite panel sends invitees to a blank room

**Current incorrect state**
- Invites sent from the prompt-template `/create` (the first-touch flow) drop joiners into an empty waiting page with no mic-prep, no roster, no host preview.
- The edit-draft `/create?edit=…` already has the good experience (inline user-search, mic-prep lobby, host sees joining profiles + mic status).

**Desired**
- Invitees from either entry point land in the same mic-prep lobby and the host sees them appear with mic status.

**Fix**
- Compare `CreateDebatePage.tsx` prompt-template invite panel vs the edit-draft invite panel.
- Extract the working panel into a shared component (e.g. `<DebateInvitePanel debateId draftMode />`) and mount it from both flows.
- Confirm the invite link points at the lobby route, not the empty room, in both cases.

---

## Technical notes

- Migration scope: 1 RPC audit (`resume_speaker_pause`) + 2 new columns on the argument-map table for #19. Additive only.
- Files likely touched:
  - `src/hooks/useSpeakerPause.ts`, `src/pages/DebateRoomPage.tsx`, `src/components/debate/ParticipantSharedView.tsx` (#16, #18)
  - argument-map components (#19)
  - `supabase/functions/ai-facilitator/index.ts`, `src/components/live/LiveThreadView.tsx`, post-session archive renderer (#17)
  - `src/pages/CreateDebatePage.tsx` + a new `DebateInvitePanel` (#15)
- Out of scope: Waves 1–4 already-in-flight items; facilitator AI behavior beyond the threading prompt.
- QA: full happy-path on Desktop Chrome + iOS Safari with two browsers (host + invitee) before merging #15 and #17.

## Memory write

- New file `mem://preferences/reliability-bar` with the rule above.
- Add to `mem://index.md` Core: `Reliability bar: build for consumer + enterprise — exceptionally reliable, seamless.`

---

# Wave 6 — Reliability + ship-ready polish  🟢 shipped

1. **Host failover (§2)** — `active_host_user_id` + `active_host_heartbeat_at` on `debates`. Active host beats every 20s; any speaker/facilitator/creator can claim via `claim_debate_host` RPC after 60s stale. Banner in DebateRoomPage surfaces the option.
2. ~~Notebook tabs (My Take/Thoughts/Annotations)~~ — already shipped; user confirmed current notebook is correct.
3. ~~Argument-map rename~~ — keep current name per user.
4. **Public/private toggle** — creator-only chip in the completed-record header, writes `debates.is_public`.
5. **Smoke-test checklist** — `docs/debate-smoke-test.md` covering create → lobby → live → prep → completion → failover.
