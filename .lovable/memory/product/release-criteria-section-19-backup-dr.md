---
name: Release §19 Backup & Disaster Recovery
description: DB backups, restore drill, RPO/RTO targets, outage comms.
type: feature
---

# §19 — Backup & Disaster Recovery

## Targets (launch)
- **RPO** (max data loss): 24 hours.
- **RTO** (max downtime): 4 hours for full restore; 1 hour for read-only public surfaces.
- Acceptable at launch scale; tighten when MAU >10k or first paying Edu/Civic contract.

## Database backups
- Supabase managed daily backups: 7-day retention on launch plan; upgrade to 14-day before flipping waitlist off.
- Point-in-time recovery (PITR) enabled — requires Supabase paid tier. **Blocker**: confirm tier covers PITR before launch.
- Weekly logical dump (`pg_dump`) via scheduled GitHub Action → encrypted upload to a second-region S3 bucket (`dynamo-backups-cold`). 30-day retention. Guards against Supabase-account-level loss.

## Storage backups
- User uploads (avatars, banners, covers, session cover art) live in Supabase Storage.
- Weekly storage sync (rclone in GitHub Action) → same cold S3 bucket. 30-day retention.
- No backup of transient artifacts (transcripts older than 1y are exportable from primary DB; cold backup is enough).

## Edge function code
- Source of truth = git repo (Lovable). No separate backup needed.
- Secrets: documented in `docs/secrets.md` (names only, never values). Re-creatable from password manager.

## Restore drill (must complete before waitlist-off)
- **Quarterly cadence post-launch; ONE successful drill required pre-launch.**
- Procedure:
  1. Spin up a fresh Supabase project (`dynamo-dr-test`).
  2. Restore latest cold `pg_dump` + storage sync.
  3. Point a preview branch at it; run smoke test: signup, create debate, join, end, view record.
  4. Time entire run; must complete <4h.
  5. Document in `docs/dr-drill-YYYY-MM-DD.md`.
- Tear down DR project after drill.

## Outage comms
- Status page: **statuspage.dynamo.today** via free tier of BetterStack Status (or instatus).
- Components: API, Auth, Realtime, Live Sessions, Web Push, Payments.
- Auto-updated from uptime monitors (§10) for green/red. Incidents posted manually by founder.
- Subscribers (email) can opt in from the status page itself — no in-app integration at launch.
- In-app banner on degraded state: when `feature_flags.incident_banner` is set (founder toggle), red bar at top of every authenticated page with linked message.
- Pre-written templates in `docs/incident-templates.md`: investigating / identified / monitoring / resolved.

## Data export (user-side resilience)
- Account → "Export my data" → edge function `export-account-data` produces a JSON+media zip emailed to user within 24h.
- Required for GDPR (§20) and doubles as user-level backup.

## Out of scope at launch
- Multi-region active-active.
- Hot standby DB.
- Automated failover.
- <1h RTO.
- Continuous backup beyond Supabase PITR window.
- Real-time replication to cold backup.

## Acceptance checklist
- Supabase PITR enabled and verified by founder dashboard screenshot.
- 14-day retention active.
- Cold S3 bucket exists, encrypted, in a different region from Supabase project.
- Weekly `pg_dump` GitHub Action green for 2 consecutive runs.
- Weekly storage rclone Action green for 2 consecutive runs.
- ONE end-to-end restore drill completed and documented, RTO <4h.
- Status page live at status subdomain with all components listed.
- `feature_flags.incident_banner` toggle wired and renders banner sitewide.
- `export-account-data` edge function delivers usable zip within 24h on test account.