## Goals
1. Add a comments section to debates, live sessions, and Change-My-Mind records (preview + post-record).
2. Allow optional cover image upload during creation of debates, lives, and CMM — and editable later.
3. Hide archived items from Home and Explore everywhere; only show in profile My Agenda.

---

## 1. Comments

### Database
New table `record_comments`:
- `id uuid pk`, `created_at`, `updated_at`
- `record_type text` — `'debate' | 'live_session' | 'change_my_mind'`
- `record_id uuid` (debate_id or live_session_id)
- `parent_id uuid` (nullable, for one level of replies)
- `user_id uuid`, `body text`

RLS:
- SELECT: anon + authenticated, only when the parent record is publicly visible (debate `is_public = true` / `live_sessions.is_public = true`). Mirrors existing public-read pattern.
- INSERT: authenticated; user_id = auth.uid(); record must be visible.
- UPDATE / DELETE: only the comment author.

Realtime: enable on `record_comments` so threads update live.

### UI
New component `RecordCommentsSection` rendered:
- **Preview pages** (`DebateScheduledPreviewPage`, the live preview, CMM preview): directly **below the Interested button** (or below the owner's Edit button if creator).
- **Post-record / completed pages** (`ExploreDebateDetailPage`, `DebateRecordPreview`, `SessionRecordViewV2` record view, CMM record): **below the threaded record**.

Behavior:
- Lists comments newest-first with author avatar + name + relative time.
- One level of replies (parent_id).
- Composer: textarea + submit; for unauthenticated users the composer is replaced with an `AuthPromptDialog` trigger ("Sign in to comment").
- Author can delete own comment.
- Realtime appends new comments.

### Notifications (light)
Insert a `notifications` row for the record owner when someone comments (type `comment`). Reuse existing notifications surface.

---

## 2. Cover image upload (optional, editable later)

### Storage
New public bucket `record-covers` (single bucket for all three record types). RLS:
- Public read.
- Authenticated insert/update/delete restricted to objects under `${auth.uid()}/...` path prefix.

### Schema
- `live_sessions.cover_image_url text null` — add column (debates already has it).
- (CMM uses the `debates` table, so no change needed there.)

### UI: creation flows
Add a new "Cover image (optional)" upload control:
- `CreateDebatePage` — in the cover/details step.
- `CreateChangeMyMindPage` — in the setup step before publish.
- Live session start (in `SessionRecordView` / start sheet) — optional pre-record field; if record is started instantly, allow setting via the edit panel below.

Component: `CoverImageUploader` (new) — drag/drop or click, preview, replace, remove. Falls back to `gradientFromSeed(topic)` if empty (existing behavior in `DebateCoverCard` is preserved).

### UI: edit later
- Debate: surface in existing debate edit panel (or a new "Edit cover" button on owner-only view of preview/record pages).
- Live session: in the existing session settings menu (`EditSetupPanel`-equivalent for live).
- CMM: same edit panel as debate (since CMM is a debate row).

---

## 3. Hide archived items from Home + Explore

Audit and ensure every Home/Explore query excludes `status = 'archived'`. The current code already does for debates but **owner queries in `useMyRecentDebates` keep them out only via `.neq("status","archived")` for created, but the parts join filters in JS** — confirmed already excluded.

Action items:
- Verify and unify all Home/Explore hooks (`useHomeDebates`, `useExplore`, `useForYouDebates`, `useMyRecentDebates`, live session queries) to exclude `status = 'archived'` for both debates and live_sessions.
- Profile page `MyDebatesPage` / "My Agenda" tab: explicitly include archived under a dedicated "Archived" subtab (or filter chip), so users still have access to their archived content there.

---

## Technical notes

- Comments component is shared across all three record types via a `record_type` + `record_id` prop.
- RLS for comments mirrors the public visibility checks already used by `debate_tags` / `live_session_tags`.
- Cover bucket path convention: `record-covers/{user_id}/{uuid}.{ext}` for clean per-user RLS.
- Auth gating uses existing `AuthPromptDialog` for unauthenticated commenters and uploaders.
- No changes to `supabase/integrations/types.ts` (auto-generated after migration).

---

## Files to add / edit (high level)

**New**
- `supabase/migrations/<ts>_record_comments_and_covers.sql` (table, RLS, realtime, bucket, `live_sessions.cover_image_url`)
- `src/components/comments/RecordCommentsSection.tsx`
- `src/hooks/useRecordComments.ts`
- `src/components/upload/CoverImageUploader.tsx`

**Edit**
- `src/pages/CreateDebatePage.tsx`, `src/pages/CreateChangeMyMindPage.tsx`, live start surface in `src/components/live/SessionRecordView.tsx` (or its V2)
- `src/pages/DebateScheduledPreviewPage.tsx`, `src/pages/DebatePreviewPage.tsx`, `src/pages/ExploreDebateDetailPage.tsx`, `src/components/debate/DebateRecordPreview.tsx`, `src/components/live/record/SessionRecordViewV2.tsx`, `src/pages/ChangeMyMindRoomPage.tsx`
- `src/hooks/useExplore.ts`, `src/hooks/useHomeDebates.ts` — confirm archived exclusion for debates AND live_sessions
- `src/pages/ProfilePage.tsx` / `src/pages/MyDebatesPage.tsx` — add archived view under My Agenda

After approval I'll implement in this order: migration → cover uploader + creation flows → comments table + component + integration → archive filter audit + profile archive view.