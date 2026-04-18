
Locked-in scope. Final copy + behavior:

**Hint copy (replaces base muted text while active):**
- Friends widget empty → "Your friends and followers go here."
- My Recent empty → "Your conversations go here."
- For You empty → alternates every 5s: "Break the ice!" ↔ "Move a mountain!"

**Activation:**
- Desktop (`(hover: hover)`): active while pointer is over the empty card.
- Mobile/touch: `IntersectionObserver` → on entry, active for 3s then fade. Re-triggers on viewport re-entry only (no re-loop).

**Other in-scope changes:**
- Remove "Welcome to Dynamo" card from `HomePage.tsx` + drop unused `Sparkles` import.
- Logged-out users can view `/` (un-gate in `App.tsx`); Debate + Live cards open `AuthPromptDialog` instead of routing.
- My Recent empty "Create" button: smooth-scroll to action row + 1.5s ring pulse on Debate/Live cards.

## Files
- `src/App.tsx` — remove `ProtectedRoute` from `/`
- `src/pages/HomePage.tsx` — auth-gated CTAs, hint overlays, scroll+highlight, remove Welcome card
- `src/components/home/FriendsOnlineWidget.tsx` — wrap empty state with hint overlay
- `src/hooks/useEmptyStateHint.ts` — NEW (hover vs IO+3s timer, re-entry only)
- `src/components/home/EmptyStateHint.tsx` — NEW (fade swap, optional 5s rotation)
- `src/components/AuthPromptDialog.tsx` — NEW (Sign up / Log in modal)

## Out of scope (not touching)
- Tasks 6 (Sentry/Plausible) and 7 (rate limits)
- Task 4 (manual mobile QA)

```text
┌─ Hints ───────────────────────────────────────┐
│ Desktop: hover swap                           │
│ Mobile: 3s on viewport entry, re-entry only   │
│ Friends → "Your friends and followers go here"│
│ My Recent → "Your conversations go here."     │
│ For You → 5s rotate: Break the ice! /         │
│   Move a mountain!                            │
└───────────────────────────────────────────────┘
┌─ Logged-out → AuthPromptDialog on Debate/Live ┐
┌─ My Recent Create → scroll + ring pulse 1.5s ─┐
┌─ Remove Welcome to Dynamo card ───────────────┐
```
