## What's going wrong

`/debate/:id/edit` maps to `DebateEditArgumentsPage` — a page for editing **your own arguments** during the 48-hour post-debate edit window. It looks up `debate_participants` and shows "You weren't a participant…" if the current user has no row there.

`ContinueButton` calls the `continue_debate` RPC, which clones the topic / subtopics / sides / tags into a brand-new `draft` debate owned by you — but it does **not** insert a `debate_participants` row for the owner (participants are only added when speakers join the lobby). It then navigates to `/debate/<newId>/edit`, so the arguments-editor immediately complains that you're not a participant.

Two bugs in one: wrong destination, and the destination has an unrelated guard.

## Fix

Change `ContinueButton` so a successful `continue_debate` navigates to `/debate/<newId>/lobby` instead of `/debate/<newId>/edit`.

- The lobby is the correct "template ready to relaunch" surface: same topic, same sides, same subtopics, same settings, fresh join code, ready to invite speakers and start.
- Owner is recognized via `created_by` (no participant row needed), so the "weren't a participant" message disappears.
- No DB / RPC changes needed — `continue_debate` already clones the template into a `draft` row.

## Files

- `src/components/record/ContinueButton.tsx` — replace `navigate(\`/debate/${newId}/edit)`with`navigate(/debate/${newId}/lobby)`.

## Out of scope

- Live-session Continue path (`/live/:id`) is unaffected.
- The 48-hour argument-edit flow at `/debate/:id/edit` itself stays as-is; it's correctly gated for actual participants of a completed debate.  
  
Yes, the Continue button and the edit button are completely different paths. After you're done with this plan, tell me whether or not an edit record page even exists.
  &nbsp;