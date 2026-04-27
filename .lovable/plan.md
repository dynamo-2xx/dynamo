## What you'll get

Three connected changes to the Create flow + joiner experience:

1. The two Sides rows merge into one editable block with a pencil-toggle.
2. A new In-person/Online toggle exposes a live join code, share link, and QR.
3. In-person joiners go through a mic-permission + level-meter check before landing in the room, and get a persistent mic bar inside.

---

### 1. Merge the two Sides rows into one editable block

Today: stacked "Participant Sides" (text inputs) + "Your side" (pick buttons). Becomes one row of two side **buttons** that double as picker and label.

- **Default (pick mode)**: each side is a button. Tap to choose which side you'll join. Selected side keeps the filled "✓ Label" treatment.
- **Pencil icon** in the block header. Tap → swaps both buttons into text inputs so you can rename either side. Tap again (now a checkmark) → returns to pick mode.
- "You'll be added as a speaker on this side." helper stays underneath.

---

### 2. In-person / Online toggle

Segmented toggle inside the Sides block (above the side buttons), defaulting to **Online**.

- **Online**: same flow as today (invite by username/email, drag-to-side). A collapsed "Share join link" panel is still available.
- **In-person**: expands a "Join in person" panel with:
  - 8-character **join code** (large monospace, tap-to-copy).
  - Full **join link** (`/join/{code}`) with copy button.
  - **QR code** rendered from the link.
  - **Max speakers per side** stepper (1–8, default 2).
  - **Project** button → fullscreen page with topic + giant code + giant QR for classroom screens.
  - Helper: "Anyone who scans signs in (or creates an account), tests their mic, then picks their side."

The draft debate is saved as soon as In-person is toggled on so the auto-generated `join_code` is immediately visible.

---

### 3. Joiner flow (in-person) — with mic check

When someone scans the QR or opens `/join/{code}`:

1. **Not signed in** → existing JoinDebatePage redirects to `/auth?redirect=/join/{code}`.
2. **Signed in** → new **"Pick your side"** screen showing topic, publisher, side labels (with live "3 on A · 1 on B" counts), and side buttons. If a side is full, it's disabled with "Full — joining as audience"; if only one side is open, auto-select it.
3. After tapping a side → **Mic Test screen**:
   - Browser mic permission prompt fires immediately.
   - On grant: shows a live **input level meter** (Web Audio `AnalyserNode` over the stream), a **device picker** dropdown (`navigator.mediaDevices.enumerateDevices`) so they can switch from phone mic → AirPods, and a "Speak now to test" prompt.
   - On deny: clear recovery message + "Try again" + "Join as audience instead" fallback.
   - **Continue** button stays disabled until we detect ≥1 second of audio above a low threshold (proves the mic actually works).
4. **Confirm** → server-side RPC `join_debate_in_person(code, side_id)`:
   - Re-checks `max_speakers_per_side`; if filled by someone else mid-flow, falls back to audience.
   - Inserts `debate_participants` (role=`speaker`).
   - Inserts `debate_invitations` (status=`accepted`) so they appear in the creator's Invited Speakers list.
   - Returns `{ debate_id, side_id, became_audience }`.
5. Redirects to the debate room with their stream already initialized.

---

### 4. Mic UX inside the debate room

Persistent bottom **mic bar** for in-person joiners:

- Their avatar + display name on the left.
- Live audio level meter (same `AnalyserNode` pattern — animated bars).
- Big mute toggle (mic icon).
- Small "switch device" menu for changing input on the fly.
- If their stream goes silent for >10 s while they're "live," a soft toast: "We can't hear you — check your mic."

---

### 5. Speaker identity (hybrid diarization)

Each in-person device streams its own audio tagged with that user's profile (display name + avatar) — no shared-mic diarization needed by default. **But** if two people share one phone:

- The existing energy-based diarization from the Live engine runs **within** that single device's stream.
- Sub-speakers detected on a shared device are tagged with the primary profile + a "Speaker A / B" suffix in the transcript, which the host can rename later from the Live Session participants tab.

This reuses `mem://technical/live-transcription-logic` (energy-based separation) without changing it; we only add the profile-tag wrapper.

---

### 6. Real-time effects on the creator's screen

- Joiner's profile chip appears in **Invited Speakers** AND in the chosen **Participant Sides** slot the moment they confirm (existing realtime subscription on `debate_participants`).
- A toast fires on the creator's view: "Maya joined Side B."
- The In-person panel updates "3 on Side A · 1 on Side B" live so the creator can see the room filling up.

---

### 7. Bonus suggestions worth keeping

1. **Project view** (giant code + QR for classroom display).
2. **Side-balance hint + auto-assign** when only one side has room.
3. **Regenerate code** button (in case the code feels stale or compromised).
4. **Toast on creator screen** for each new joiner.
5. **Pre-flight mic test** with level meter and device picker (covered above).

If any of these feel like scope creep, say which to drop. Otherwise all five are in.

---

## Technical notes

- **File touched**: `src/pages/CreateDebatePage.tsx` — Sides block restructure (lines 1019–1065) + new In-person panel.
- **New components**:
  - `src/components/create/InPersonJoinPanel.tsx` (code, link, QR, project button, max-speakers stepper, live joiner counter).
  - `src/components/join/MicTestStep.tsx` (permission prompt, level meter, device picker, gated Continue).
  - `src/components/debate/MicBar.tsx` (persistent bottom bar with meter + mute + device switch).
- **New pages**:
  - `src/pages/InPersonJoinPickSidePage.tsx` at `/join/:code/pick-side`.
  - `src/pages/InPersonJoinMicTestPage.tsx` at `/join/:code/mic-test`.
  - `src/pages/JoinCodeProjectorPage.tsx` at `/debate/:id/project-code`.
- **Existing pages reused**: `JoinDebatePage.tsx` extended to route signed-in non-participants into the pick-side step.
- **New RPC**: `join_debate_in_person(_code text, _side_id uuid)` — SECURITY DEFINER. Validates code, enforces `max_speakers_per_side`, inserts participant + invitation rows, returns debate id + assigned side + audience-fallback flag.
- **Schema migration**:
  - `ALTER TABLE debates ADD COLUMN max_speakers_per_side INT NOT NULL DEFAULT 2;`
- **Audio plumbing**: `getUserMedia` → `MediaStreamAudioSourceNode` → `AnalyserNode.getByteFrequencyData` for the level meter. Stream is stashed in a shared context (`MicStreamProvider`) so the mic test page hands the same stream off to the room without re-prompting. New deps: `qrcode.react`.
- **Diarization**: piggybacks the existing live-transcription pipeline; we just inject `profile_user_id` into each utterance payload.
- **No realtime schema changes needed** — `debate_participants` is already published via the existing room subscription.

Nothing else changes outside these files. Existing record/preview/explore work stays intact.