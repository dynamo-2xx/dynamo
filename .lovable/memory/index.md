# Project Memory

## Core
- **Visuals**: Pure white (#ffffff) bg, black (#0a0a0a) text. Instrument Serif (headings, antialiased), DM Sans (body).
- **UI Elements**: Borders 0.5px solid rgba(0,0,0,0.1). Primary buttons black/white; secondary minimal outline.
- **Auth**: Exclusively use `onAuthStateChange`. Never use `getSession` to prevent lock contention.
- **AI Behavior**: Facilitator (brand mark **DYNAMO**, replaces "d.") is strict "no-fluff" (1-2 sentences). Never generate global session summaries.
- **State**: Always use fetch-and-merge before transcript database upserts to prevent race conditions.
- **Layout**: `h-screen` strict viewport constraint for debate rooms.
- **RLS**: Debate-scoped tables gate SELECT via `public.can_view_debate(debate_id)`. Never `USING (true)` on debate data.

## Memories
- [Release Criteria](mem://product/release-criteria) — Public-ready definition (waitlist, happy path, mic-prep, study)
- [Session Formats](mem://product/session-formats) — Verified Debate/CMM/Live spec: roles, lifecycle, mic policy, v1 caps
- [Branding Guidelines](mem://style/branding) — Monochrome palette, typography specs, and accent colors
- [Signature Interactions](mem://style/signature-interactions) — Typewriter AI, pulsing timer, flipping transcript cards
- [Debate Room Interface](mem://features/debate-room-interface) — 3-layer h-screen layout, dynamic Main Box vs Sidebar splits
- [Debate Creation UI](mem://features/debate-creation-ui) — Padding tokens, rotating tagline, button labels
- [Explore Discovery](mem://features/explore-discovery-structure) — High-density, Apple Music-inspired layout sections
- [Navigation Structure](mem://features/navigation-structure) — Hub structure, active states, My Agenda
- [Onboarding Flow](mem://auth/onboarding) — Auth rules, roles, and location permission prompts
- [Invite Onboarding](mem://features/onboarding-invite-flow) — Unauthenticated preview room, side selection before auth
- [Monetization](mem://product/monetization-tiers) — Free, Pro, Education, and Civic tier limits
- [Civic Features](mem://features/civic-features) — Location discovery and Verified gold civic seals
- [Invitation System](mem://features/invitation-system) — Join codes, Projector/Audience links, claim slots
- [Debate Access Control](mem://features/debate-access-control) — RBAC, publisher controls, turn-gated text
- [Debate Lifecycle](mem://features/debate-lifecycle) — 48-hour edit window, auto-advance, completion overlay
- [Preparation Phase](mem://features/preparation-phase) — Sync logic, idempotent updates, role assignment
- [AI Facilitation Logic](mem://features/ai-facilitation-live-logic) — AI transition behavior, round summary constraints
- [Speech-to-Text Config](mem://features/speech-to-text) — Deepgram endpointing thresholds for Debate vs Live modes
- [Hardware Access](mem://technical/hardware-access) — Mic/cam toggling, layout splits, sync with Deepgram
- [Live Subtitles](mem://features/live-subtitles) — InterimText overlay on camera feeds
- [Live Transcription Logic](mem://technical/live-transcription-logic) — RMS gating, word-level splitting for speaker changes
- [Live Session Logic](mem://features/live-session-logic) — 13-pattern comms framework, dynamic subtopic baskets
- [Live Session UI](mem://features/live-session-ui) — Consecutive entry grouping, grouped card counts
- [Live Analysis Engine](mem://technical/live-analysis-engine) — 2-pass Gemini architecture, prompt arrays, intervals
- [Live Multi-Device](mem://features/live-session-multi-device-roadmap) — Join code, device-as-speaker, host controls
- [Transcript Persistence](mem://technical/transcript-persistence) — Fetch-and-merge strategy to avoid overriding updates
- [Transcript Summaries](mem://features/transcript-and-summaries) — Smart filtering, 4-line clamp, expansion reset on flip
- [Debate Archive](mem://features/debate-archive) — Subtopic dropdowns, flipped cards, Full Transcript
- [Record Q&A Chat](mem://features/record-qa-chat) — AI Q&A via Gemini, citation hotlinks, CitationModal
- [Auth Session Management](mem://technical/auth-session-management) — Strict rules for Supabase auth listener usage
- [View Synchronization](mem://technical/view-synchronization) — Supabase Realtime sync, Projector/Audience view rules
- [RLS Helpers](mem://security/rls-helpers) — can_view_debate SECURITY DEFINER pattern for debate tables
- [Debate Notify + Push](mem://features/debate-notify-and-push) — INTERESTED?/HAPPENING tag rules and Web Push pipeline (VAPID, SW, dispatch fn)
- [Clubs feature](mem://features/clubs) — Clubs hub, membership/roles, Events that spawn debate/live/CMM
- [Mic Lobby & Policy](mem://features/mic-lobby-and-policy) — Pre-live mic lobby + per-format mic enforcement