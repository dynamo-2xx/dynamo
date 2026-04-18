

## Replace ping flow with Direct Messages + Inbox

### Preview page change
- Non-owner sees one button: **"Interested?"** → opens composer dialog.
- Composer:
  - Three role chips at top: each side label + "Spectator". Selecting one fills the textarea with editable default: `I would like to participate as a [Role]. What time shall we meet?`
  - Editable textarea, "Send message" button.
- On send: create/find DM thread with publisher → insert message → toast → button becomes "Open conversation" linking to `/messages/:threadId`.
- Remove floating coordination chat button and any owner-side pending-interest panel.

### New DM system
New tables:
```
dm_threads (id, user_a, user_b, debate_id nullable, last_message_at, created_at)
  -- unique on (LEAST(user_a,user_b), GREATEST(user_a,user_b), COALESCE(debate_id,'00...'))
dm_messages (id, thread_id, sender_id, body, created_at, read_at nullable)
```
RLS: only the two participants of a thread can SELECT/INSERT. Realtime enabled on both.

RPC `get_or_create_dm_thread(_other_user uuid, _debate_id uuid)` → returns thread id (handles the sorted-pair lookup atomically).

### Messages tab in sidebar (NEW)
- Add **Messages** entry in `AppLayout.tsx` sidebar nav, placed directly **below Profile**, icon `MessageCircle`.
- Also add to mobile bottom nav (replace or squeeze in — keep 4 items: Home, Explore, Messages, Profile).
- Unread badge (red dot + count) sourced from `dm_messages` where `recipient = me AND read_at IS NULL`, via realtime subscription.

### `/messages` page
- Two-pane layout (desktop) / stacked (mobile):
  - **Left**: thread list — other user's avatar + display name, last message preview, timestamp, unread dot. Sorted by `last_message_at desc`.
  - **Right**: active thread — message bubbles (sender right, other left), composer at bottom. Marks messages read on view.
- Route `/messages` (list) and `/messages/:threadId` (auto-opens that thread).

### Notifications
- Add `direct_message` notification type. On send, insert notification for recipient with deep-link to `/messages/:threadId`.
- Drop `interest_received` going forward (keep type for legacy rows).

### Files

```text
NEW  supabase migration                            — dm_threads, dm_messages, RLS, realtime, RPC
NEW  src/pages/MessagesPage.tsx                    — inbox + active thread
NEW  src/hooks/useDirectMessages.ts                — threads, messages, send, unread count, realtime
NEW  src/components/debate/InterestedComposer.tsx  — role chips + editable textarea + send
EDIT src/components/AppLayout.tsx                  — Messages nav entry (desktop + mobile) with unread badge
EDIT src/pages/DebateScheduledPreviewPage.tsx     — swap to InterestedComposer; remove interest panel + floating chat
EDIT src/App.tsx                                  — add /messages and /messages/:threadId routes
EDIT src/lib/notifications.ts                     — add direct_message type
DEL  src/components/debate/InterestThreadChat.tsx
DEL  src/components/debate/InterestedDialog.tsx
```

### Confidence
- Composer + DM tables + send: 95%
- Inbox page + realtime + unread badge: 90%
- Sidebar Messages entry (desktop + mobile): 98%

