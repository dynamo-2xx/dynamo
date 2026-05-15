---
name: Release §13 Error Handling & Offline
description: Branded error pages, indefinite live reconnect with host evict, read-only offline, toast+inline+retry surfacing.
type: feature
---

# §13 — Error Handling & Offline

## Live-session disconnect (indefinite reconnect + host evict)
- Client uses Supabase Realtime + WebRTC heartbeat. On socket loss:
  - **No timeout** — client retries with exponential backoff (1s → 2s → 5s → 10s, capped) **forever** while tab stays open.
  - User's `live_session_participants.last_seen_at` stops updating; their bubble in the room shows a **dimmed avatar + "Reconnecting…" pill**.
  - On reconnect, same `device_id` reclaims the same `speaker_slot` (existing `join_live_session` RPC already handles this).
- **Host evict control**: host sees a "Remove" button on any participant whose `last_seen_at` > 30s. Click → `evict_live_participant(session_id, device_id)` RPC deletes the row + frees the slot. Evicted client receives a broadcast and is bounced to a "You were removed from this session" screen.
- Auto-prune fallback: existing `purge_stale_live_participants` keeps running for genuinely-abandoned tabs (>10s for heartbeat purposes is too aggressive given the indefinite policy — bump to **5 minutes** for auto-prune so host evict is the primary mechanism).
- Turn-locked formats (Debate): if the **current speaker** disconnects, the turn timer keeps running. Host can either evict + advance, or wait. No automatic skip.

## Branded error pages
- `/404` — branded NotFound page (already exists, polish copy + add "Report this" link that opens mailto with prefilled URL).
- `/500` — new branded ErrorPage. Shown by top-level React error boundary in `App.tsx`. Includes:
  - DYNAMO wordmark.
  - "Something broke on our end." headline.
  - "Try again" button (reloads route).
  - "Go home" link.
  - Quiet Sentry event ID footer for support.
- Both pages report to **Sentry** (per §10) with route + user_id (if any).
- No live status banner at launch (deferred — we don't have a status page yet).

## Offline behavior — READ-ONLY
- Service worker (already registered for PWA in §7) caches:
  - App shell (HTML/JS/CSS).
  - Last 20 viewed records (transcript + summary JSON).
  - User's own profile + recent notebook list.
- **Writes blocked when offline**: any mutation (create session, post comment, publish notebook, send invite, etc.) shows a `toast.error("You're offline — try again when connected")` and the action does **not** queue. User retries manually after reconnect.
- Global "You're offline" banner pinned to top of viewport when `navigator.onLine === false`; auto-dismisses on reconnect.
- Live sessions cannot be joined offline — entry routes show an inline error state with retry.

## Failure surfacing pattern (Toast + Inline + Retry)
Three tiers, applied consistently:
1. **Transient / background failures** (analytics ping, presence heartbeat, optimistic UI rollback) → `toast.error` with concise message. No retry button — auto-handled.
2. **User-initiated action failures** (form submit, button click, API mutation) → `toast.error` **with retry action button** for idempotent operations. Inline form-field errors for validation issues.
3. **Page/data-load failures** (record fetch, list fetch, profile fetch) → **inline error state** on the affected card/section with "Retry" button. Never blank-screen.

Standard error component: `<ErrorState message retry />` lives in `src/components/ui/`. All data-fetching hooks return `{ data, error, retry }` so consumers can render this consistently.

## Sentry capture rules
- All errors from React error boundary → Sentry `fatal`.
- All `toast.error` calls automatically forward the underlying error → Sentry `error` (PII scrubbed).
- Network failures (fetch reject) → Sentry `warning` (high volume, low signal individually).
- Edge function 5xx → Sentry from server side already (per §10).

## Data model / new
- No new tables.
- New RPC: `evict_live_participant(_session_id uuid, _device_id text)` → owner-gated (`is_live_session_host`); deletes row + broadcasts on `presence-{session_id}` channel.

## Out of scope at launch
- Write-queue / offline mutation replay (deferred — read-only is enough for v1).
- Live status / incidents page.
- Per-region failover.
- Background sync via SW (post-launch).
- Conflict resolution UI for offline edits (N/A while writes are blocked offline).
- Auto-screenshot on error for support tickets.

## KPIs (PostHog)
`error_page_shown` (404|500), `live_disconnect`, `live_reconnect_success`, `live_evicted`, `offline_banner_shown`, `mutation_blocked_offline`, `inline_retry_clicked`.

## Acceptance checklist
- [ ] Kill network mid-live-session → bubble dims + "Reconnecting…" → restore → slot reclaimed automatically.
- [ ] Host can evict a stale participant within 30s of their last heartbeat.
- [ ] Hitting `/garbage-route-xyz` shows branded 404 with Sentry event captured.
- [ ] Throwing in any page component triggers branded 500 + Sentry fatal.
- [ ] DevTools offline mode: read flows work for cached records; mutations show offline toast and do not queue.
- [ ] Failed list fetch shows `<ErrorState retry />` inline; click retry refetches without page reload.
