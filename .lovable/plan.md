

## Pre-launch checklist

Two categories of work remain: (1) the security findings that we discussed earlier but were never actually applied, and (2) light polish + the data cleanup you just asked for.

### 1. Delete the 11 stuck live debates

Hard delete all `debates` rows where `status = 'live'` (11 rows, oldest from 2026-03-09, newest 2026-03-30). Cascading rows in `debate_participants`, `debate_sides`, `debate_subtopics`, `arguments`, `round_summaries`, `debate_transcripts`, `debate_invitations`, `debate_grades`, `debate_tags` will be removed in the same transaction (no FKs declared, so we delete child rows explicitly first).

No live_sessions are stuck (`status='recording'` returns 0 rows).

### 2. Outstanding security findings (10 total — never actually shipped)

The earlier "security fix" pass didn't land in the database. Re-running the scan confirms all 10 are still open:

**Errors (3) — must fix before launch:**
- `debates` SELECT policy is `true` → leaks every private debate's topic, join code, scheduling to any signed-in user. Restrict to `is_public = true OR created_by = auth.uid() OR EXISTS participant`.
- `debate_invitations` → no DELETE policy; emails + tokens persist forever. Add DELETE for creator/invitee on accepted/rejected rows.
- `realtime.messages` → no RLS, anyone can subscribe to any private debate channel. Add policy gating channel topic against `debate_participants`/`debates.created_by`.

**Warnings (7) — fix together since they're the same pattern:**
- `arguments`, `debate_participants`, `debate_sides`, `debate_subtopics`, `round_summaries` — all use SELECT `true`. Replace with helper `can_view_debate(debate_id)` that checks public OR creator OR participant.
- `live_sessions.share_token` — add SELECT policy `share_token IS NOT NULL AND share_token = current_setting(...)` OR drop the column. Recommend keeping + adding a token-based RPC since `SharedLiveSessionPage` exists.
- `avatars` / `banners` public buckets — leave public (intentional for profile images), mark finding as acknowledged.

Approach: one migration creating a `can_view_debate(uuid)` SECURITY DEFINER helper, then drop+recreate the 6 affected SELECT policies, plus the realtime + invitations DELETE policies.

### 3. Auth hardening

Enable **leaked password protection** in Supabase Auth settings (HaveIBeenPwned check on signup/password change). One toggle.

### 4. SEO / social polish (`index.html`)

- Replace OG image `https://lovable.dev/opengraph-image-p98pqg.png` with a Dynamo-branded image (or remove until you have one).
- Replace `twitter:site` `@Lovable` with your handle (or remove).
- Remove the `<!-- TODO -->` comment.
- Add `<link rel="canonical">` once you have your custom domain.

### 5. Final smoke test

After the above: log out → confirm Explore loads with public debates only, log in as a second account → confirm you can't see another user's private debate, create a debate with tags → confirm it appears under the topic page, follow a user → confirm presence widget updates.

---

### Technical notes

- Use migration tool for the schema/policy changes (steps 2).
- Use insert tool (DELETE statements) for the live-debate cleanup (step 1).
- Auth setting (step 3) is a Supabase config toggle, not a migration.
- `index.html` is a regular file edit.
- Two new memory files worth saving after: `mem://security/rls-helpers` (the `can_view_debate` pattern) and update the index Core line about RLS.

