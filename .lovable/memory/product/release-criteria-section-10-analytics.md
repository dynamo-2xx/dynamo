---
name: Section 10 — Analytics & Observability
description: PostHog product analytics + Sentry error tracking + email-only alerting at launch
type: feature
---

# §10 — Analytics & Observability

## Product analytics — PostHog
- **PostHog Cloud** at launch (self-host post-launch if cost requires).
- Frontend SDK (`posthog-js`) initialized in `main.tsx` with project key from publishable env var.
- Edge functions emit server-side events via PostHog Node SDK using a runtime secret `POSTHOG_API_KEY`.
- Anonymous capture allowed (waitlist visitors); `posthog.identify(user.id)` on auth.
- Disable autocapture for sensitive surfaces (auth forms, DM bodies, notebook contents) via `data-ph-no-capture` and route-level opt-out.

### Required events (launch set)
| Event | Where | Properties |
|---|---|---|
| `signup_started` | auth page | method (email/google) |
| `signup_completed` | post-verify | user_id, source |
| `onboarding_completed` | onboarding | duration_ms |
| `session_created` | create flows | format (debate/cmm/live), is_public |
| `session_started` | room | session_id, format |
| `session_completed` | end overlay | session_id, format, duration_ms |
| `record_published` | toggle public | record_id, format |
| `invite_sent` | invitations tab | session_id, count |
| `invite_accepted` / `invite_declined` | notification | invitation_id |
| `notebook_published` | my study | notebook_id |
| `error_caught` | Sentry bridge | message, route |

### KPIs locked for launch dashboard
- **DAU / WAU / MAU** (active = any captured event).
- **Sessions completed** (debate + CMM + live, broken out).
- **Records published** (count + public-toggle rate).
- **Invite acceptance rate** = accepted / sent (rolling 7d).

Defer to post-launch: D1/D7/D30 retention cohorts, viral K-factor, AI-quality metrics, tier conversion. Events still captured at launch so dashboards can backfill.

## Error tracking — Sentry
- `@sentry/react` for frontend, `@sentry/deno` for edge functions.
- Runtime secret: `SENTRY_DSN` (one DSN, separate environments via `environment` tag: `preview` / `production`).
- Source maps uploaded on build via Sentry Vite plugin.
- Capture `unhandledrejection` + React error boundary at `App.tsx` root.
- Sentry events bridged into PostHog as `error_caught` so PostHog funnels can filter sessions with errors.
- PII scrubbing on by default (no email/IP forwarded).

## Alerting — email-only to founder
- **Sentry**: alert rule on any `level:fatal` OR `level:error` with >5 events/hour → email founder.
- **Uptime**: external monitor (BetterStack or UptimeRobot free tier) on `joindynamo.lovable.app/` and `.../auth` every 1 min → email on 2 consecutive failures.
- **Supabase health**: weekly digest only (no realtime alerts at launch).
- No Slack/Discord/PagerDuty integration at launch.

## Privacy & consent
- Analytics opt-out toggle in account settings ("Don't track my activity"). Sets `posthog.opt_out_capturing()` and persists in profile.
- Cookie banner not required (no advertising cookies; analytics is first-party). EU users still get the opt-out toggle prominently in onboarding footer.
- Documented in Privacy page (§9 / §20).

## Out of scope for v1 (deferred)
- Session replay (PostHog has it; defer until we hit a debugging case that needs it — heavy on storage).
- Heatmaps.
- Cost/spend dashboards → moved to **§18 — Admin & Founder Tools**.
- Funnels/cohorts beyond the 4 launch KPIs.
- Custom A/B testing harness.

## Secrets to add
- `POSTHOG_API_KEY` (server-side capture from edge functions).
- `SENTRY_DSN`.
- `SENTRY_AUTH_TOKEN` (build secret for source-map uploads — workspace-level).

`POSTHOG_PROJECT_KEY` (publishable) lives in code as a Vite env var, not a runtime secret.
