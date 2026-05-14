---
name: Release Criteria — Section 6: Performance Budgets
description: First-paint splash, throttled realtime above 300, virtualized Explore, one-channel-per-visible-tab
type: feature
---
# Section 6 — Performance Budgets (1000+ users)

Communicated via user stories. All decisions below are runtime/perf rules.

## Story 1 — Sara on spotty 4G (slow first paint)
**Decision: Branded DYNAMO splash up to 2.5s, then content fades in**
- Inline a tiny SSR-equivalent splash directly in `index.html` (DYNAMO wordmark + tagline, no JS, no fonts beyond system fallback).
- Splash fades out as soon as the React root mounts AND the route's first meaningful data has resolved (or 2.5s timeout, whichever first).
- Critical CSS for splash is inlined; main bundle preloads in parallel.
- Budget: splash visible <500ms on 4G; full first paint ≤2.5s on 4G p75.
- No skeleton shells globally — splash IS the loading state for cold loads. Skeletons remain for in-app navigation between routes.

## Story 2 — 800-person live debate (realtime pile-up)
**Decision: No hard cap; throttle update frequency above 300 concurrent viewers**
- Owner/participant updates always realtime (broadcast immediately).
- Audience subscribers: server-side coalescer batches transcript/argument-map deltas every 2-3s once `presence_count > 300`. Below 300, word-by-word streaming as today.
- Threshold + interval are config values (env: `REALTIME_THROTTLE_THRESHOLD=300`, `REALTIME_THROTTLE_MS=2500`).
- Audience clients show a tiny "Live · batched" pill when in throttled mode (transparency).
- Presence heartbeat itself drops from 5s → 15s in throttled mode.

## Story 3 — Marcus scrolling Explore forever
**Decision: Infinite scroll with virtualization (~30 cards in DOM)**
- Use `@tanstack/react-virtual` (or react-window) for Explore feed, For You, search results, Clubs lists.
- Page size: 20 per fetch; cursor-based pagination (never `range(0, 1000)`).
- Hard cap per query: 50 rows max from Supabase; never approach the 1000-row default.
- Images lazy-loaded with `loading="lazy"` + explicit width/height (CLS protection).
- Profile pages (debate cards, notebook cards) also virtualized when count >50.

## Story 4 — Lin's 5 open debate tabs (channel pile-up)
**Decision: One realtime channel per visible tab; suspend on hidden**
- Use `document.visibilitychange` to disconnect Supabase channels when tab becomes hidden.
- Reconnect (and refetch latest state via fetch-and-merge) on visibility return.
- Per-session cap: ≤10 active channels (debate/live/CMM rooms naturally stay under this).
- Notification bell uses ONE app-wide channel, not per-route.
- Background-tab debates show "Reconnecting…" toast on refocus if state was stale >30s.

## Performance budgets (acceptance criteria)
- Home, Explore, Debate Room first paint ≤2.5s on 4G p75.
- Largest Contentful Paint ≤2.5s; CLS <0.1; INP <200ms.
- No Supabase query returns >50 rows without pagination; never >1000.
- ≤10 active realtime subscriptions per session.
- JS main bundle <300KB gzipped (excluding lazy chunks).
- Lighthouse Performance ≥85 on mobile for Home, Explore, Record.

## Implementation tasks queued
1. Inline DYNAMO splash in `index.html` + fade-out hook in `src/main.tsx`.
2. Server-side realtime coalescer (edge function or DB trigger) gated by presence count.
3. Virtualize Explore / For You / Clubs lists; audit all `.range()` calls for caps.
4. `useVisibilitySuspendedChannel` hook wrapping Supabase channel subscriptions.
5. Lighthouse CI budget check in deploy pipeline.
