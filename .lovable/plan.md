

## Add "Interested" inbox to publisher preview + floating DM window

### What I'm building

**1. Owner-only "Interested" panel on preview page**
- On `/debate/:id/preview`, when viewer is the debate owner, show a new section above (or alongside) the existing owner controls.
- Lists users who sent a DM tied to this debate (`dm_threads` where `debate_id = this debate` AND owner is `user_a` or `user_b`, sorted by `last_message_at desc`).
- Each row: avatar + display name + last message snippet + timestamp + unread dot.
- Click row → opens the floating DM window (below) preloaded to that thread.
- Empty state: same visual language as Home's "Find People" empty hint — soft icon, single-line copy: *"No one has reached out yet. Share your debate to get interest."*

**2. Floating draggable DM window** (Instagram-style)
- Fixed-position card, bottom-right by default, ~360×500px.
- Header: other user's avatar + name, expand button (→ goes to `/messages/:threadId`), close button. Drag handle on header (mouse + touch, clamped to viewport).
- Body: reuses thread-view content from `MessagesPage` (message bubbles + composer at bottom).
- Single global instance: state managed via a small context (`FloatingDMContext`) so any component can call `openThread(threadId)`.
- Mounted once in `AppLayout` so it persists across route changes.
- Mobile (<768px): falls back to full-screen overlay (no drag) — don't try to fit a draggable window on small screens.

**3. Reuse existing pieces**
- Extract the active-thread pane from `MessagesPage.tsx` into `src/components/messages/ThreadView.tsx` so both the full page and the floating window render the same UI.
- Use existing `useDirectMessages` hook for thread + message data.

### Files

```text
NEW  src/contexts/FloatingDMContext.tsx           — open/close/active thread state
NEW  src/components/messages/FloatingDMWindow.tsx — draggable card, mobile-fullscreen fallback
NEW  src/components/messages/ThreadView.tsx       — extracted thread bubbles + composer
NEW  src/components/debate/InterestedInboxPanel.tsx — owner panel: list + empty state
EDIT src/components/AppLayout.tsx                 — wrap children in FloatingDMProvider, mount FloatingDMWindow once
EDIT src/pages/MessagesPage.tsx                   — use shared ThreadView
EDIT src/pages/DebateScheduledPreviewPage.tsx     — render InterestedInboxPanel for owner
```

### Confidence
- Owner inbox panel + empty state: 95%
- Floating draggable window (desktop) + mobile fallback: 90%
- Shared ThreadView extraction: 95%

