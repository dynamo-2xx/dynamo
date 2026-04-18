

## Plan: Joined participants section + button rename

### 1. "People who have already joined" on preview Interested tab
In `InterestedInboxPanel.tsx`, add a section above the DM list that fetches `debate_participants` for this debate, joined to `profiles`, grouped by `side_id`. Show avatar + display name pills under each side label. Hidden when no one has joined yet.

### 2. Bottom buttons on template (CreateDebatePage.tsx Step 3)
Current: "Save Debate →" and "Publish Debate →".

New behavior:
- **Create mode** (new debate): "Save Draft →" + "Publish Debate →" (unchanged left button label clarified; right launches publish flow setting status=`scheduled`).
- **Edit mode, debate is `draft`**: "Save Draft →" + "Publish Debate →".
- **Edit mode, debate is `scheduled` (already published)**: "Save Debate →" + "Start Debate →". "Start Debate" sets status=`live`, started_at=now(), and navigates to `/debate/:id` (the live room).

Logic: detect `editId` + loaded `debate.status` to choose labels and right-button action.

### Questions
None — clear from your message.

### Files
```text
EDIT src/components/debate/InterestedInboxPanel.tsx — add joined participants section above DM list
EDIT src/pages/CreateDebatePage.tsx                 — relabel buttons by mode/status; add Start Debate action (status=live, started_at, navigate to /debate/:id)
```

### Confidence
- Joined section query + render: 95%
- Button relabel by mode/status: 97%
- Start Debate action (status→live + navigate): 95%

