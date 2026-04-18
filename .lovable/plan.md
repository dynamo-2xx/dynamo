

## Plan

### 1. Tag Console — view records & manage subtopics

In `src/pages/AdminTagsPage.tsx`, expand `TagRow` so each tag becomes expandable:

- **Click a tag row** to toggle an expanded panel showing:
  - Linked **debates** (query `debate_tags` joined with `debates`, show title + status, link to `/debate/:id/preview`)
  - Linked **live sessions** (query `live_session_tags` joined with `live_sessions`, link to `/live/:id`)
  - Each record gets a "Move to subtopic →" dropdown listing this tag's child subtopics; selecting one swaps the join row's `tag_id`.
- **"+ Add subtopic"** button per tag → prompts for name, creates a new tag with `parent_tag_id = <this tag>.id`, `is_official` inherited from parent.
- **Subtopic display**: child tags render indented under their parent in both Official and Community sections (group by `parent_tag_id` in render).
- Existing rename / merge / delete / reparent controls stay; reparent dropdown already supports moving any tag into a parent.

### 2. Home page — reorder action buttons

In `src/pages/HomePage.tsx`, swap the order so the **Create + Live grid** appears *above* `<FriendsOnlineWidget />`. The widget keeps its current styling but moves below the primary actions.

### 3. Profile page — regroup sections

In `src/pages/ProfilePage.tsx`, restructure into three card groups in this order:

1. **Activity group** (new top group): My Agenda → Connections → Inbox
2. **Account group** (existing): Role, Profile Visibility, Location
3. **Admin group** (admins only, bottom): Tag Console — isolated in its own card with a divider above

Profile header card and Sign Out stay where they are.

### Technical notes

- Subtopic count check: `debate_tags` INSERT policy currently caps at 5 tags per debate — moving a debate from parent → child counts as a swap (delete + insert), still passes the cap.
- Subtopic creation by admin uses existing `tags` INSERT policy (admins satisfy it; `is_official` defaults handled in code).
- No DB migrations needed — schema already supports `parent_tag_id` and the join tables.

