---
name: Release §20 Legal & Compliance
description: Template legal pages (ToS, Privacy, Guidelines, Subprocessors) + signup consent. US/Delaware jurisdiction, CCPA-aware. Marked as template, replace before commercial launch.
type: feature
---

# §20 Legal & Compliance (v1)

Template legal coverage for public-ready posture. Not legal advice — every page carries a "template, replace before commercial launch" banner.

## Decisions locked
- **Jurisdiction**: USA, Delaware governing law
- **Contact**: `privacy@dynamo.today` (placeholder, set up forwarding later)
- **Copy**: AI-drafted, CCPA-aware, AI disclosure included
- **Skipped**: cookie consent banner, imprint (US — not required), DPA download, real lawyer review (post-profitability)

## Routes
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy (references §19 export/delete flow)
- `/guidelines` — Community Guidelines
- `/legal/subprocessors` — Lovable Cloud, Lovable AI Gateway, Deepgram, Web Push

## Components
- `src/components/legal/LegalLayout.tsx` — shared wrapper; Instrument Serif h1, DM Sans body, "Last updated" date, template warning banner at top
- `src/components/legal/LegalFooter.tsx` — discreet footer on public pages only (landing, auth, explore). Never mounted in debate/live rooms (preserves `h-screen` constraint)

## Signup consent
- Required checkbox on `AuthPage` signup: "I agree to the [Terms](/terms) and [Privacy Policy](/privacy)"
- Submit blocked until checked
- On successful signup, write `tos_accepted_at` (timestamptz) + `tos_version` (text, currently `"2026-05-16"`) to `profiles`
- Migration: `20260516203852_*.sql` added the two columns (nullable; existing users not backfilled)

## Acceptance
- All 4 pages render, no console errors
- Footer visible on `/`, `/auth`, `/explore`; absent from debate/live rooms
- New signups blocked without consent; `profiles.tos_accepted_at` populated
- Every legal page carries the template banner

## Not in v1
- Cookie banner, imprint, existing-user reconsent modal, lawyer review, Education DPA
