---
name: Release §15 Trust & Safety
description: Reporting pipeline, moderation queue, sanctions ladder, appeals, civic-seal abuse.
type: feature
---

# §15 — Trust & Safety at scale

## Reporting pipeline
- Report button on every user-generated surface: profiles, debates, live sessions, CMM, records, notebooks, comments, reader notes, DMs, club pages, club events.
- Per-message granularity inside transcripts and threads (matches §9 commitment).
- Form: reason enum (`harassment`, `hate`, `sexual`, `violence_threat`, `spam`, `impersonation`, `civic_misuse`, `other`) + optional 500-char note.
- Writes to `content_reports` table: `id, reporter_id, target_kind, target_id, reason, note, status, created_at, resolved_at, resolved_by, resolution`.
- Reporter sees toast confirmation only — no status updates pushed (avoids retaliation triangulation).

## Moderation queue (founder-only at launch)
- `/admin/reports` page, gated by `has_role(uid,'admin')`. Sort: oldest open first.
- Each row: target preview, reporter count (dedupe same target), reason histogram, "Open in context" deep link.
- Actions: dismiss / warn / remove-content / suspend-7d / ban / escalate-civic.
- All actions write to `moderation_actions` audit log (immutable, append-only).
- Target T+24h response on any single report; T+1h on `violence_threat` (founder gets email + push alert from §10 Sentry pipeline tagged `safety_urgent`).

## Sanctions ladder
1. **Warn** — DM from system + 7-day "warned" flag on profile (private to mods).
2. **Remove content** — soft-delete + reason logged; author notified with snippet.
3. **Suspend 7d** — `profiles.suspended_until`; blocks signin with branded screen + appeal link.
4. **Ban** — `profiles.banned_at` + reason; account frozen, public artifacts hidden, records anonymized to "Removed user" (matches §9 deletion behavior).
5. **Civic-seal revocation** — separate action; downgrades `is_verified` and logs to public `/seals` page (§9 transparency commitment).

## Appeals
- Single-step: suspended/banned user gets `/appeal` form (one submission per sanction). Goes to same `/admin/reports` queue tagged `appeal`.
- Founder reviews; outcomes: uphold / reduce / overturn. Logged to `moderation_actions`.
- No SLA at launch (best-effort), surfaced in ToS.

## Civic-seal abuse
- `/seals` page lists every active + revoked civic seal with grant/revoke timestamps and reason (already owned by §9).
- Reports tagged `civic_misuse` skip normal queue and land in a dedicated tab; revocation is the default action.

## Anti-abuse plumbing
- Rate limits (edge function middleware): DMs 30/min, reports 10/hour, invites 50/day, signup 5/IP/day. Excess → 429 + Sentry `rate_limit_hit`.
- HIBP password check on signup (already in onboarding-v2).
- Disposable-email block list at signup (free `disposable-email-domains` list, refreshed monthly).
- Image uploads scanned via Lovable AI Gateway moderation pass before storage commit (covers profile, banner, cover, club cover). NSFW/violence → reject with generic error.

## Out of scope at launch
- Automated text moderation (manual queue only; revisit when queue exceeds 50/day).
- Trusted-reporter program.
- Public transparency report (revisit at 6 months).
- Multi-mod role hierarchy (single `admin` role).
- IP / device fingerprint bans.

## Acceptance checklist
- Report button reachable from every UGC surface, ≤2 taps.
- `content_reports` + `moderation_actions` tables exist with RLS (admin-only read).
- `/admin/reports` renders queue; all 5 ladder actions execute and log.
- Suspended user hits branded screen with appeal link.
- `/seals` reflects revocations within 60s.
- Sentry alerts route `violence_threat` reports to founder email + push.