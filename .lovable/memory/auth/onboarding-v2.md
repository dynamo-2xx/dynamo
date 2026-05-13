---
name: Onboarding v2 (account-bound spec)
description: Role trio kept; location deferred to first account-bound action; SUPERCELL-ID-style display name + private friend code; HIBP on
type: feature
---

## Role picker
Keep personal / education / community trio in onboarding step 1. Doubles as a positioning tool. Inferred refinement can come later.

## Location
**Do NOT prompt during onboarding.** Spectating (Explore, public records, live viewing) is fully account-optional and never triggers the prompt.

Trigger location prompt **only on first account-bound action**. Account-bound = anything that creates user-owned content we must store and hold accountable:
- Sending a DM
- Posting in any comment section (debate / live / cmm / notebook records)
- Creating a debate / live / CMM session or notebook
- Adding a friend
- Subscribing / following / interested-tagging
- Editing profile

User story: *"As a curious visitor I can browse debates and watch a live session without being asked for my location. The first time I try to comment, DM, or create something, the app asks because my contribution becomes attached to a real person and a real place."*

## Identity — SUPERCELL-ID style
One field: `display_name` (mutable, non-unique). System generates immutable private **Friend Code** (e.g. `DYNM-7K2X-9P4Q`) for direct-link friending. No public @handles, no username squatting, no username search.

Schema: `profiles.display_name` (text), `profiles.friend_code` (text, unique, generated at profile creation).

## HIBP
Leaked-password check enabled by default.
