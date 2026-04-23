

# Shazam-style hero action button

Replace the side-by-side Debate/Live cards with a single big circular hero button. The visible button represents the active feature (Debate or Live). Users swipe (mobile) or tap arrows (desktop) to switch. A short description sits next to the button.

## Concept illustration

```text
Mobile (stacked, swipeable):
┌───────────────────────────────┐
│   ●  ○                        │ ← dots indicate which feature
│                               │
│         ╭─────────╮           │
│         │         │           │
│         │   +     │  ← big circular button (tap = go)
│         │         │           │
│         ╰─────────╯           │
│                               │
│         Debate                │ ← feature label
│   Structure a sincere         │
│        dialogue               │
│                               │
│   ← swipe to switch →         │
└───────────────────────────────┘

Desktop (side-by-side with arrows):
┌────────────────────────────────────────────────┐
│                                                │
│  ╭───╮   ╭─────────╮                           │
│  │ ‹ │   │         │   Debate                  │
│  ╰───╯   │   +     │   Structure a sincere     │
│  ╭───╮   │         │   dialogue                │
│  │ › │   ╰─────────╯   ● ○                     │
│  ╰───╯                                         │
└────────────────────────────────────────────────┘
```

## Behavior

- Two slides: **Debate** (PlusCircle icon, "Structure a sincere dialogue", → `/create`) and **Live** (Radio icon, "Capture a real conversation", → `/live/new`).
- Big circle (~180px mobile, ~200px desktop): black bg, white icon, subtle shadow + soft pulsing ring (signature interaction). Tap/click = navigate to that feature's route. If unauthenticated, opens `AuthPromptDialog`.
- **Mobile**: horizontal swipe (framer-motion `drag="x"` with snap) to switch slides; auto-pauses any pulse during drag. Below button: feature name + one-line description, centered.
- **Desktop (≥md)**: small `‹` `›` arrow buttons left of the circle; description sits to the right of the circle. Swipe still works on touch desktops.
- Dot indicators (●○) show active slide; tappable to jump.
- Keyboard: ←/→ arrows switch when the hero is focused; Enter/Space triggers the active feature.
- Replaces the current 2-column action grid in `HomePage.tsx`. Everything below (My Study, Find People, For You, My Recent) is unchanged.
- Respects branding: monochrome, Instrument Serif label, DM Sans description.

## Files

- **New** `src/components/home/HeroActionShazam.tsx` — encapsulates the swipeable circle, arrows, dots, label/description block, auth gating.
- **Edit** `src/pages/HomePage.tsx` — swap the existing `<div ref={actionRowRef} className="grid grid-cols-2 ...">` block for `<HeroActionShazam highlight={highlightActions} onUnauth={() => setAuthPromptOpen(true)} />`. Keep `actionRowRef` / scroll-to behavior pointed at the new component.

## Out of scope

- Adding more than the two existing features (Debate, Live).
- Changing routes or the `AuthPromptDialog` itself.
- Restyling other home sections.

