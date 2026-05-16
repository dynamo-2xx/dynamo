---
name: Release §19 Backup & Disaster Recovery
description: Lovable Cloud daily backups, RPO 24h/RTO 4h, dual export (founder + user GDPR), soft-delete with anonymization and founder content review.
type: feature
---

# §19 — Backup & Disaster Recovery

**Decisions locked by founder:**
- Backup cadence: **Daily automated (Lovable Cloud default)** — 7-day retention. No separate cold storage.
- Recovery targets: **RPO 24h / RTO 4h.**
- Data export: **Both** — founder-only manual dump AND user-facing "Download my data" (GDPR).
- Account deletion: **Self-serve soft delete + 30-day grace + content anonymization + founder/admin content review** (see flow below).

**Assumed by me (challenge any):**
- No cold off-site backup at launch. If Lovable Cloud loses the project entirely, we lose everything beyond the 7-day window. Acceptable for v1.
- Founder dump = ad-hoc `pg_dump` via Lovable Cloud (no scheduled job).
- User export = JSON zip with their debates, notebooks, transcripts they spoke in, profile. **Excludes** other speakers' transcript lines (privacy).
- "Anonymize" means we replace `display_name` with "Former user," strip `avatar_url`, null out `affiliation` and `bio` — but keep the user_id and content rows intact so debates/transcripts remain coherent.
- Review queue is **opt-out, not opt-in**: by default content stays (anonymized). Founder/admin only acts to remove specific items.

## Backups (Lovable Cloud managed)
- Daily automated snapshot, 7-day retention. Zero setup.
- Founder can trigger ad-hoc manual snapshot before risky migrations via Lovable Cloud UI.
- No second-region cold storage at launch (out of scope below).

## Recovery targets
- **RPO 24h**: in worst case we lose up to a day of writes.
- **RTO 4h**: from incident-declared to read-write restored. Read-only public surfaces (homepage, /explore) target <1h via static fallback page.
- Tighten when MAU >10k or first paying Edu/Civic contract.

## Data export — founder side
- Manual `pg_dump` via Lovable Cloud whenever needed.
- No scheduled job. Founder runs before launches, migrations, or on request.

## Data export — user side ("Download my data", GDPR)
- Account → Settings → "Download my data" button.
- Edge function `export-account-data` generates a zip and emails a signed download link within 24h.
- Contents (JSON + media):
  - Profile (display_name, avatar, bio, affiliation, location, created_at).
  - All debates they created (full transcript + grades + arguments + sides + subtopics).
  - All live sessions they hosted (full transcript + summaries).
  - All notebooks they own (thoughts, my_take, reader notes received).
  - Their own transcript lines from debates/live sessions they participated in but didn't create.
  - DMs they sent or received.
  - All uploaded media (cover images, avatars, banners) as files.
- Excludes: other users' content; AI cost logs; admin tables.
- Rate-limited to 1 export per user per 7 days.

## Account deletion flow (locked)

**Step 1 — User initiates (self-serve):**
- Account → Settings → "Delete my account" → confirm modal explains what happens.
- Account flagged `deleted_at = now()`, `deletion_status = 'pending_review'`.
- User immediately logged out; can sign back in within 30 days to cancel (`deletion_status = 'cancelled'`, `deleted_at = NULL`).

**Step 2 — 30-day grace window:**
- Account hidden from search, profile shows "Account deleted" placeholder.
- User cannot create new content but their existing content remains visible.
- One reminder email at day 23 ("7 days left to recover").

**Step 3 — Day 30, hard delete + anonymize (cron job):**
- `auth.users` row deleted (Lovable Cloud auth deletion — login becomes impossible).
- `profiles` row: `display_name = 'Former user'`, `avatar_url = null`, `banner_url = null`, `bio = null`, `affiliation = null`, `location = null`, `is_public = false`. **Row kept** so user_id foreign keys remain valid.
- All content (debates, transcripts, notebooks, arguments, grades, DMs, live sessions) **retained and anonymized via the profile** — coherence preserved.
- Account flagged `deletion_status = 'anonymized'`.

**Step 4 — Founder/admin content review (opt-out queue):**
- `/admin/deletion-review` page (gated by `FOUNDER_USER_ID`, same as §18 dashboard).
- Lists all anonymized accounts from the past 90 days with their public content (debates created, live sessions hosted, public notebooks).
- Per-item actions: **Keep (default)** | **Remove**.
- "Remove" hard-deletes that specific item (debate, session, notebook) and cascades transcripts.
- No automated removal — founder/admin must explicitly act.
- Reasoning: most content is public-good (debates, civic discussions) and should survive the user; only act when content is problematic.

**DMs:**
- Always hard-deleted at step 3 (private 1:1 content; no review).

## Schema changes (to migrate)
- `profiles.deleted_at timestamptz` (nullable).
- `profiles.deletion_status text` — `null | 'pending_review' | 'cancelled' | 'anonymized'`.
- `profiles.deletion_initiated_at timestamptz` — for the day-23 reminder cron.
- Cron job: daily 02:00 UTC, finds `deleted_at < now() - interval '30 days' AND deletion_status = 'pending_review'`, runs anonymize.
- Cron job: daily 03:00 UTC, sends day-23 reminders.

## Outage comms
- Status page: **status.dynamo.today** via BetterStack Status free tier.
- Components: API, Auth, Realtime, Live Sessions, Web Push, Payments.
- Founder posts incidents manually; status auto-reflects uptime monitor pings (§10).
- In-app banner via `feature_flags.incident_banner` toggle — renders red bar sitewide.
- Pre-written templates in `docs/incident-templates.md`: investigating / identified / monitoring / resolved.

## Out of scope at launch
- Cold off-site backups (S3 cross-region, weekly pg_dump GitHub Action).
- Point-in-time recovery beyond Lovable Cloud's 7-day window.
- Hot standby / multi-region / automated failover.
- <1h RTO.
- Bulk user-initiated export (only single-user "Download my data").
- Encrypted-at-rest backups beyond what Lovable Cloud provides natively.
- Right-to-be-forgotten beyond anonymization (we keep content; if a user demands full content removal for GDPR Art. 17 we handle case-by-case manually).

## Acceptance checklist
- Lovable Cloud daily backup confirmed via dashboard screenshot.
- Manual snapshot drill: founder takes one, restores to a preview branch, verifies signup + create debate + view record works. **Documented in `docs/dr-drill-YYYY-MM-DD.md`. Must complete <4h.**
- `export-account-data` edge function delivers usable zip within 24h on test account.
- Soft-delete flow: test account deletes → can recover within 30 days → cron anonymizes correctly on day 31.
- `/admin/deletion-review` lists anonymized accounts and "Remove" wipes the targeted debate/session/notebook.
- Status page live at `status.dynamo.today` with all components.
- `feature_flags.incident_banner` toggle wired and renders sitewide.
- Day-23 reminder email tested.
