## Mission statement (memory addition, first action)

Before any build work, I'll save your mission as a Core memory so every future decision is anchored to it.

> **Dynamo's mission**: Scale face-to-face discourse to a 21st-century standard. Words matter only when there are people willing to own them. Humanity's destiny belongs to our collective intellect, not privatized interests. Persuasion is power — and people can practice it. **Bring people to the power.**

File: `mem://product/mission` + Core line in `mem://index.md`.

---

## How to read this plan

For each section: **user story** (what someone experiences), **what I build**, **confidence** that the v1 deliverable matches the memory spec on the first build pass.

- 🟢 High (90%+) — well-scoped, conventional work
- 🟡 Medium (70–85%) — real moving parts, may need 1–2 polish rounds
- 🟠 Lower (50–70%) — research/cost/integration risk, expect iteration

---

## §1 Auth & Onboarding — 🟢
*"As a new visitor, I sign up with email or Google in under 90 seconds and land in a personalized home."*
Email magic link + Google, mandatory ToS checkbox, SUPERCELL-ID display name, friend code, HIBP password check, location deferred to first action that needs it.

## §2 Core Happy Path — 🟡
*"As a host, I generate a debate from one sentence, invite friends, run mic-prep, hold the session, get a record."*
Generate → Invite → Mic-Prep → Live → Record loop wired end-to-end with host failover and private-default records. The hinge of the whole product.

## §3 My Study — 🟡
*"As a participant, I annotate any record, spawn a notebook, publish my take separately from my notebook."*
Floating draggable/resizable/fullscreen notebook overlay, two independent publish toggles, notebook-on-notebook, highlight-to-comment.

## §4 In-person reliability — 🟡
*"As an in-person host, only the right people get a mic; no two devices echo; a no-show slot frees itself."*
Per-format mic enforcement ✅, echo guard toggle ✅, mic lobby + silence warning ✅, owner +15m no-show banner ✅. Deferred to v1.1: "Speaking as" piggyback pill, per-seat hold timeout.

## §5 Data safety — 🟢
*"As a user, I get a 48-hour grace to undo deletes; my data export works."*
Soft-wall preview, 48h delete grace, guest retention, club audit log + 48h recover.

## §6 Performance budgets — 🟡
*"As a viewer, the app loads fast even with 500 people watching."*
DYNAMO splash on first paint, realtime throttling above 300 concurrent, virtualized Explore (20/page, 50 cap), one channel per visible tab.

## §7 Mobile/PWA + Accessibility — 🟡
*"As a phone user, I install Dynamo to my home screen and the room feels native; as a keyboard or screen-reader user, I can fully participate."*
Manifest + install chip + offline shell, iOS audio unlock, full-screen Argument Map sheet, keyboard map, ARIA live regions, colorblind faces, i18n wrapper from launch.

## §8 Notifications & Lifecycle — 🟢
*"As an invitee, I get a push 5 minutes before, and a celebration when the session ends."*
5 push channels, bell-icon arrival toast, pg_cron lifecycle dispatcher, 5s grace + chime, celebration overlay, T-2h edit-window banner, owner no-show auto-cancel at +15m.

## §9 Content & Legal queue — 🟢
*"As a user, I can report a message; as the founder, I have a queue to act on."*
ToS inline acceptance, `/seals` transparency page, 30-day account deletion with anonymized contributions, per-message report queue.

## §10 Analytics & Observability — 🟢
PostHog events + KPIs, Sentry errors, email-only alerts at launch.

## §11 Launch & Growth — 🟢
*"As a curious lurker, I land on a beautiful OG card and join the waitlist; as a Pro user, I have invite credits."*
Soft waitlist ✅, invite credits ✅, OG cards wired on Debate/Record/Live via `og-image` edge function ✅, per-page meta + canonical via `useDocumentMeta` ✅.

## §12 Monetization & Payments — 🟡
*"As a free user, I hit a clear wall and can upgrade in two clicks."*
All 4 tiers (Free/Pro/Edu/Civic), Stripe Checkout monthly-only, hard paywall, Edu/Civic sales-led. Pricing numbers owned by §18.

## §13 Error handling & Offline — 🟢
Branded 404/500, indefinite live reconnect + host evict, read-only offline, toast+inline+retry pattern.

## §14 i18n — 🟢
EN-only at launch but every string routed through `t()`; locale-aware data + AI/Deepgram routing; RTL deferred.

## §15 Trust & Safety — 🟢
Per-message reports, founder-run mod queue, 5-step sanctions ladder, appeals, civic-seal revocation, rate limits + image moderation.

## §16 Email — 🟢
Resend on `mail.dynamo.today` with SPF/DKIM/DMARC, 12 transactional templates, weekly digest via `pg_cron`, List-Unsubscribe + suppression list.

## §17 Billing Ops — 🟡
Stripe Customer Portal, idempotent webhook, dunning ladder, Stripe Tax (EU OSS). No self-serve refunds at launch.

## §18 Cost Tracking & Spend — 🟡
*"As the founder, I see per-feature unit costs and a spend dashboard before the bill hits."*
Per-source budgets, usage logs, founder cost dashboard, pricing-decision queue feeding §12. Heavy backend wiring.

## §19 Backup & DR — 🟡
RPO 24h / RTO 4h, Supabase PITR + weekly cold `pg_dump` to second-region S3, **mandatory pre-launch restore drill**, status subdomain. GDPR export + soft-delete/anonymize flow.
Status page ✅ at `/status` (DB + auth + backup row), backup workflow stub ✅ in `.github/workflows/db-backup.yml`, `backup_runs` table ✅. Still pending: actual restore drill on staging.

## §20 Legal & Compliance — 🟢
Template `/terms`, `/privacy`, `/guidelines`, `/legal/subprocessors`. Signup writes `tos_accepted_at` + `tos_version`. Already partially shipped.

## §21 Performance Intelligence (Premium) — 🟡
*"As a Pro user, I see a color/face-coded breakdown of my debate performance and can hand a moment to DYNAMO for coaching."*
Live light pass + post-session deep pass, 3 dashboard surfaces, DYNAMO handoff via quoted message, blurred-preview paywall for free tier. AI pipeline is the unknown.

## §22 Clubs — 🟢
*"As a club organizer, I run recurring debates with my members and approve who joins."*
Owner/Admin/Member hierarchy ✅, Featured directory row on `/clubs` ✅, 3 event types + recurrence_rule column ✅, in-club event launch ✅, admin-approval toggle on ClubEditPage + gated join ✅.

## §23 Sharing, Co-ownership & Pause — 🟢
Viewer/Co-owner share tiers, fork-on-complete only (no live co-edit at v1), uniform host-only Pause/Resume across Debate/Live/CMM.

## §24 Continue button — 🟢
Linear-chain v1/v2/v3 continuations on completed Debate/CMM/Live (never Notebooks). Per-click "bring participants?" modal. Divider row + version badges in transcript. Quota: 1 record per continue.

## §25 Import-to-Record — 🟡
*"As a user, I drop a YouTube link or a PDF and Dynamo gives me back a fully threaded debate record I can annotate, share, and continue."*
Second dropbox on `/create` accepting YouTube/file/PDF/article. Full-screen "People to the Power!" loader. Private by default. Counts as 1 Debate quota. Per-tier minute caps. New `import-to-record` edge function orchestrating fetch → transcribe → structure → persist.
v1 status: article-URL + raw-text + **PDF (unpdf)** paths live, tier-gated (Pro+), 20/day soft cap, quota increment wired. Audio/video still 501 stubs pending Deepgram transcription.

---

## Build order

I'll work the foundation first, then the experience, then the commerce/ops layer, finishing with the two heaviest AI features:

1. **Foundation** — §1, §20 (already partial), §13, §14, §5
2. **Core product** — §2, §3, §4, §6, §7, §8
3. **Discovery & community** — §22, §11, §0
4. **Trust & comms** — §9, §15, §16, §10
5. **Money & ops** — §18 → §12 → §17 → §19
6. **Power features** — §23, §24, §21, §25

## What I will NOT touch unless you ask

- Branching/forking continuations (linear chain only at v1)
- Live co-editing of shared records (fork-on-complete only)
- RTL languages, lawyer-reviewed legal, cookie banner, DPA
- Self-serve refunds
- Anything outside `mem://` rules

## Overall confidence

About **80%** of these sections land on the first build pass exactly per memory spec. The 🟠 items (§4, §18, §21, §25) are where I expect 2–3 iteration rounds — they involve hardware variability, cost integrations, or AI pipelines whose real-world behavior we'll only see once data is flowing.

## Deliverable for THIS pass (plan mode)

1. Write `mem://product/mission` with your mission statement.
2. Add a one-line mission anchor to the **Core** section of `mem://index.md` so it's always in context.
3. No code changes. Build phase starts on your next message.
