## Why you can't pick a side

On the scheduled debate room (`/debate/{id}` while status is `scheduled`), the "Interested?" dialog is rendered with an empty list of sides hardcoded in the page. The composer therefore only shows the fallback "Spectator" chip — there is literally no way to choose "Ethical & Beneficial" or "Unethical & Misaligned".

The data is fine in the backend (both sides exist for this debate and RLS allows you to read them). The bug is purely on the page that hosts the dialog.

## Fix

In `src/pages/DebateRoomPage.tsx`, inside the `ScheduledRoomShell` component (the one rendered for non-live scheduled debates):

1. Add a `sides` state and fetch them alongside the publisher/participant info:
   - `supabase.from("debate_sides").select("id,label,sort_order").eq("debate_id", debate.id).order("sort_order")`
2. Pass the fetched sides to `InterestedComposer` instead of `sides={[]}`:
   ```tsx
   sides={sides.map((s) => ({ id: s.id, label: s.label }))}
   ```
3. Also pass them to `DebateRecordPreview` via `fallbackSideLabels` so the preview cards show the real side names instead of placeholders, matching the standalone preview page.
4. Hide the "Interested?" CTA for the debate's owner (`userId !== debate.created_by`) so the publisher doesn't see a button to message themselves.

After this change, opening "Interested?" will show three role chips — the two sides plus "Spectator" — each autofilling the message ("I would like to participate as a [Side]. What time shall we meet?") and routing the request to the publisher's inbox just like the standalone preview page already does.

## Out of scope

No schema, RLS, or composer changes are needed — the composer already supports any number of side chips; it just wasn't being given them.