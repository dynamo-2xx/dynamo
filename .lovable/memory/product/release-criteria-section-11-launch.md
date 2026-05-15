---
name: Release Criteria §11 — Launch & Growth
description: Waitlist, invite credits, OG share-cards, SEO surface, and growth loops at launch
type: feature
---

# §11 — Launch & Growth

## Waitlist gate (soft)
- Landing `/` shows waitlist email capture as primary CTA, with a secondary "Sign up now" link (open signup remains available).
- Waitlist entries stored in `waitlist` table: `email`, `created_at`, `referrer`, `utm_*`, `position` (auto), `invited_at` nullable, `source` ('organic'|'invite_credit').
- Confirmation email on waitlist signup (Lovable Emails) thanking them + position number.
- Founder admin (§18) can: view list, manually invite N users (sends magic-link signup email), bulk-export CSV.

## Invite credits (early-access skip)
- Reuses existing invitation system (join codes, claim slots — see `mem://features/invitation-system`).
- Each existing user gets **3 invite credits** at launch (configurable per tier in §12 monetization).
- Pro/Education/Civic tiers get more credits (defined in §12 doc).
- Sending an invite consumes a credit on accept (not on send). Inviter sees credit count in account settings.
- Invite-link signup bypasses waitlist gate entirely → straight to onboarding.
- No referral *rewards* (no extra Pro days, badges, etc.) at launch — credits ARE the mechanic.

## Share-card OG images
Auto-generated OG images (1200×630) for every public artifact:
- Debate rooms (public/published)
- Debate records (published transcripts)
- Live sessions (published)
- Notebook publishes
- Public clubs
- Public user profiles / ID-cards

**Implementation**: Edge function `og-image` renders via `@vercel/og` or Satori (Deno-compatible), cached to Supabase Storage bucket `og-images/` keyed by `{type}/{id}_{updated_at}.png`. Regenerate on artifact update. Per-route Helmet sets `og:image` to storage URL.

Card content per type:
- **Debate**: title, side labels, participant avatars, Dynamo wordmark
- **Record**: title, date, participant count, key-quote pull (1 line), Dynamo wordmark
- **Live**: title, host, participant count, Dynamo wordmark
- **Notebook**: title, author, excerpt, Dynamo wordmark
- **Club**: name, member count, founder, Dynamo wordmark
- **Profile**: display name, ID-card visual style (monochrome), Dynamo wordmark

## SEO surface
**Indexable**:
- All marketing pages (`/`, `/about`, `/pricing`, `/blog/*`, `/contact`, `/legal/*`)
- Published debate records (`/r/:slug` or `/records/:id`)
- Public debates (live + scheduled, `/d/:id`)
- Default sitewide head in `index.html` (Organization JSON-LD, sitewide og)

**Per-route head** (react-helmet-async):
- Records → `<Article>` JSON-LD (headline, author, datePublished, participants)
- Debates → `<Event>` JSON-LD (name, startDate, location='Online')
- Marketing pages → page-specific title/desc/canonical/og

**Blocked from indexing** (`noindex` via Helmet or robots disallow):
- `/app/*`, `/dashboard/*`, `/settings/*`, `/onboarding/*`, `/auth/*`, `/admin/*`
- Live sessions while in-progress (only published recap indexable)
- Notebooks (defer to post-launch decision)
- Profiles (defer; private-by-default at launch)
- Clubs directory (defer; gated discovery only)

**Sitemap**: `scripts/generate-sitemap.ts` (predev/prebuild). Entries:
- All static marketing routes
- Dynamic: every `records WHERE published=true AND visibility='public'`
- Dynamic: every `debates WHERE visibility='public' AND status IN ('scheduled','live','completed')`

**robots.txt**: Allow `/`, Disallow `/app/`, `/dashboard/`, `/settings/`, `/onboarding/`, `/auth/`, `/admin/`. Sitemap directive → `https://dynamo.today/sitemap.xml`.

**Canonical**: Always `https://dynamo.today/...`. Strip query params except for content-defining ones (e.g., `?ref=` allowed but canonical points to clean URL).

## KPIs to track (bridges to §10)
- `waitlist_signup`, `waitlist_invited`, `waitlist_converted` (waitlist → signed up)
- `invite_credit_consumed`, `invite_acceptance_rate` (already in §10)
- `og_card_generated`, `og_card_served` (rough share velocity)
- Organic traffic (PostHog `$pageview` + utm_source split)

## Out of scope at launch
- Referral rewards (extra Pro days, badges, K-factor incentives)
- Affiliate program
- Public clubs/profiles indexing
- Press kit / media room page
- A/B testing landing variants (manual rollout only)
- SSR for accurate per-page social previews on non-JS crawlers (LinkedIn/Slack will see sitewide OG fallback)

## Schema additions
```sql
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  position serial,
  referrer text,
  utm_source text, utm_medium text, utm_campaign text,
  invited_at timestamptz,
  source text NOT NULL DEFAULT 'organic',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: insert open to anon; select/update/delete admin-only.

ALTER TABLE public.profiles ADD COLUMN invite_credits int NOT NULL DEFAULT 3;
```

## Files / functions to ship
- `src/pages/Landing.tsx` — waitlist form + secondary signup link
- `supabase/functions/waitlist-signup/index.ts` — insert + send confirmation email
- `supabase/functions/og-image/index.ts` — render OG cards on demand, cache to Storage
- `supabase/functions/admin-waitlist-invite/index.ts` — founder-only batch invite
- `scripts/generate-sitemap.ts` — extend with dynamic record + debate entries
- `public/robots.txt` — disallow app routes
- `src/main.tsx` — wrap in `<HelmetProvider>`
- Per-route `<Helmet>` in record/debate/marketing pages
