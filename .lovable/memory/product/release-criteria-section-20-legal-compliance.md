---
name: Release §20 Legal Entity & Compliance
description: GDPR/CCPA, DPA, data residency, age gating, ToS/Privacy posture.
type: feature
---

# §20 — Legal Entity & Compliance

## Entity (founder action, blocks launch)
- US LLC or C-Corp registered before any paid sale clears. Stripe payouts require it.
- Business address (mail-forwarding OK) published in ToS + Privacy.
- EIN obtained; opened business bank account for Stripe payouts.

## Documents
- **Terms of Service** at `/terms` (already shipped in §9). Inline acceptance at signup recorded with timestamp + ToS version hash on `profiles.tos_accepted_at` + `tos_version`.
- **Privacy Policy** at `/privacy` — must cover: data collected (auth, profile, transcripts, audio, payment metadata), processors (Supabase, Resend, Stripe, Lovable AI Gateway, Deepgram, PostHog, Sentry, BetterStack), retention windows, user rights, contact.
- **Cookie / Tracking notice** — first-party analytics only (§10), so no consent banner required; opt-out toggle in settings is the lawful basis surface.
- **DPA (Data Processing Addendum)** template at `/legal/dpa` — pre-signed downloadable PDF; Edu/Civic customers can countersign. Required for any EU institutional customer.
- **Subprocessor list** at `/legal/subprocessors` — public table of every processor with purpose + region. Updated on change with email notice to active paid customers.
- All three pages reviewed by a lawyer **before waitlist-off**. (Founder action — not codeable.)

## Data subject rights
- **Access**: "Export my data" (built in §19) covers GDPR Art. 15 + CCPA right-to-know.
- **Erasure**: 30-day soft-delete + anonymization (built in §9). Covers GDPR Art. 17 + CCPA right-to-delete.
- **Rectification**: profile edit page covers Art. 16.
- **Objection / restriction**: email `privacy@dynamo.today` → manual handling (queue in same `/admin/reports` UI with tag `privacy_request`). 30-day SLA.
- **Portability**: export zip is JSON + media (machine-readable) — covers Art. 20.
- **Do Not Sell / Share** (CCPA): we don't sell data; explicit statement in Privacy + footer link `/do-not-sell` that lands on a one-line confirmation page.

## Data residency
- All primary data in Supabase EU region (Frankfurt) at launch — chosen because EU has stricter rules and US users are unaffected.
- Cold backups in a second EU region (§19).
- Processors with US data flows (Stripe, PostHog, Sentry, Resend) covered by SCCs or DPF certification — verified per-processor and listed in `/legal/subprocessors`.

## Age gating
- Self-declared 16+ at signup (EU GDPR threshold; covers US COPPA 13+ with margin).
- Checkbox + DOB year picker. Under 16 → blocked with "Dynamo requires you to be 16 or older."
- No identity verification at launch; declaration on file is the lawful basis.
- Civic verification flow (§9) separately captures stronger identity for the seal — does not double as age proof.

## Records-retention schedule (published in Privacy)
| Data | Retention |
|---|---|
| Account + profile | Until deletion + 30d grace |
| Transcripts (private records) | Indefinite while account active |
| Transcripts (published records) | Indefinite; anonymized on user deletion |
| Audio streams | Not retained (Deepgram streaming only) |
| Payment metadata | 7 years (tax law) |
| Auth + security logs | 90 days |
| Moderation actions | 5 years |
| Analytics events (PostHog) | 12 months rolling |
| Sentry errors | 30 days |
| Email suppression list | Indefinite (deliverability) |

## Accessibility legal posture
- WCAG 2.1 AA target (already owned by §7 Accessibility).
- VPAT (Voluntary Product Accessibility Template) drafted before any Edu/Civic sale — sales artifact, not launch blocker for B2C.

## Out of scope at launch
- SOC 2 / ISO 27001 (revisit at first Edu/Civic enterprise contract).
- HIPAA / FERPA-specific BAAs.
- Region-specific consent banners.
- Localized ToS/Privacy translations (EN only — §14).
- Cross-border data transfer impact assessments (TIA) beyond standard SCCs.
- Children's product (under 16) — out of scope, gated at signup.

## Acceptance checklist
- Legal entity registered; EIN + business bank account live.
- ToS, Privacy, DPA, subprocessor list, do-not-sell pages published and lawyer-reviewed.
- Signup records `tos_accepted_at` + `tos_version`.
- Age gate blocks under-16 with friendly message.
- Supabase project confirmed EU region; cold backups EU region.
- Subprocessor table renders dynamically from a config file so updates ship without code review friction.
- `privacy@dynamo.today` mailbox monitored; queue tag wired in admin reports UI.
- Export-my-data + delete-my-account flows tested end-to-end on a throwaway account.