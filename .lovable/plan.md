## §20 — Legal & Compliance (v1)

Ship template legal pages so the app is presentable for public/published use. Not legal advice — every page carries a "template, replace before commercial launch" banner.

### Decisions locked
- **Jurisdiction**: USA, Delaware governing law (standard startup default)
- **Contact**: `privacy@dynamo.today` (placeholder — set up email forwarding later)
- **Copy**: AI-drafted templates, CCPA-aware, AI disclosure included, marked as template
- **Skipped**: cookie consent banner, imprint (not required in US)

### New routes
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy (references §19 export/delete flow)
- `/guidelines` — Community Guidelines (debate conduct, harassment, moderation)
- `/legal/subprocessors` — Subprocessors list (Lovable Cloud, Lovable AI Gateway, Deepgram, Web Push providers)

### Components
- `LegalLayout.tsx` — shared wrapper: max-w prose, Instrument Serif h1, DM Sans body, "Last updated" date, "Template — not legal advice" callout at top
- `LegalFooter.tsx` — discreet footer rendered on public pages (landing, auth, explore) with ToS / Privacy / Guidelines / Subprocessors links + © year
- Mount footer in public layouts only — do not pollute the debate-room `h-screen` views

### Signup consent (#5)
- Add required checkbox to auth signup form: "I agree to the [Terms](/terms) and [Privacy Policy](/privacy)"
- Block submit until checked
- On successful signup, write `tos_accepted_at` + `tos_version` to `profiles`
- Migration adds those two columns (default null; trigger backfills nothing — existing users prompted on next login via a lightweight modal — **optional, ask before adding**)

### Acceptance criteria
- All 4 pages render at their routes, no console errors
- Footer visible on `/`, `/auth`, `/explore`; hidden in debate/live rooms
- New signups cannot complete without checking the consent box
- `profiles.tos_accepted_at` populated for new signups
- All pages carry the "template" banner

### Not in this plan
- Cookie banner (skipped)
- Imprint (skipped)
- Existing-user reconsent modal (will ask separately)
- Real lawyer review (you'll do post-profitability)
- DPA download for Education tier (deferred until first edu customer)
