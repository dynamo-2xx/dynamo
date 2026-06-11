---
name: Unified Record Shell
description: Shared RecordShell + ParticipantsRow + SidePill used by debate, live, imported records for identical post-session formatting (hero card, pills row, Transcript/Threaded tabs).
type: feature
---

Post-session records render through a single shell so debate, live, and imported records look identical.

- `src/components/record/RecordShell.tsx` — hero card (cover/gradient, status pill, title, meta), optional "About this record" details, `pillsRow` slot, `actionsRow` slot, and a default Transcript / Threaded record tabbed body backed by `ArgumentMapContent`. Default tab is `threaded` (matches the screenshot users expect).
- `src/components/record/SidePill.tsx` — single pill component with two variants:
  - `kind="side"`: `SIDE N` eyebrow + colored label (For / Against …).
  - `kind="user"`: avatar/initials + display name; wraps in `<Link to="/u/:userId">` when a `userId` is provided.
  Both render with the same outer container so a row of side pills and a row of user pills are pixel-equivalent.
- `src/components/record/ParticipantsRow.tsx` — layout rules: 1–2 pills → `grid-cols-2`; 3–4 → wraps to 2×2; 5+ → horizontal scroll-snap row with edge arrows (uses `useEdgeScroll`).
- `src/hooks/useLiveParticipants.ts` — resolves `speaker_slot → { user_id, display_name, avatar_url }` from `live_session_participants`. Falls back to `live_sessions.created_by → profiles` for single-device slot 0. Unresolved slots render as a non-clickable pill.

Wiring:
- `ImportedRecordPage` → `RecordShell kind="imported"`, no pills row.
- `DebateRoomPage` completed branch → `RecordShell kind="debate"` with `ParticipantsRow` of `kind="side"` pills.
- `LiveSessionPage` ended phase + `SharedLiveSessionPage` → `RecordShell kind="live"` with `ParticipantsRow` of `kind="user"` pills.

The legacy `SessionRecordViewV2` split-pane (notebook + annotations + citations + cross-refs side panel) is no longer rendered. Notebook + highlight-to-annotate continue to work everywhere via `RecordToolsMount` mounted by each page.

`DebateRecordPreview.tsx` is still used for pre-completion previews (scheduled / live previews with ghost rendering); only the completed branch uses `RecordShell`.