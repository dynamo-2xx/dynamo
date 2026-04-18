

## First — your question about mock data

**Yes, the mock data on the Explore page must be removed before shipping.** The `featuredDebates`, `trendingDebates`, `latestDebates`, and the static `categories` array in `src/pages/ExplorePage.tsx` are hardcoded fixtures. Real public debates already exist in the `debates` table — we just need to wire the page to them. Folded into the plan below.

## Vision recap

Three connected systems that turn Dynamo from a private debate tool into a discoverable civic network:

1. **Tags** — every debate / live session can carry topic labels
2. **Topic pages** — each tag is an Explore destination listing every public record under it
3. **Connections** — users find each other via shared interests, locality, or activity, surfaced on Home and Profile

---

## Plan

### 1. Tags system

**Schema:**
- `tags` — `id, slug, name, description, created_by, is_official, debate_count, created_at`. Official tags = the six current Explore categories (Politics, Education, Technology, Environment, Health, Economy), seeded immediately.
- `debate_tags` and `live_session_tags` (M2M join tables)
- `debate_count` maintained by trigger on insert/delete (cheap counter for trending)
- RLS: anyone reads tags; authenticated users create non-official tags; only creator deletes an unused tag

**UI — adding tags** (4 surfaces, one shared `TagPicker` component):
- Create-debate review step (`CreateDebatePage.tsx` step 3) — new "Tags" card
- Live session setup (`LiveSessionPage.tsx`) — Tags input below title
- Post-debate record (debate ended overlay) — editable after the fact
- Post-live record view (`SessionRecordView.tsx`)

`TagPicker`: type-ahead search, suggestions ranked by `debate_count`, "Create new tag '___'" option that publishes to Explore on first use.

### 2. Topic pages on Explore

- **Replace mock arrays** in `ExplorePage.tsx` with real queries:
  - *Featured* — public debates with `status=live` or top participant count this week
  - *Trending* — top public debates by participants (last 7 days)
  - *Latest* — newest public debates
- **"More to Explore"** — query `tags` ordered by `debate_count`; official tags first, then top community tags
- **New route `/explore/topic/:slug`** — every public debate AND public live session under that tag, with filter chips (All / Debates / Live / Live now). Reuses `DebateCoverCard`.

### 3. Find-each-other system

**Schema:**
- `connections` — `user_id, connected_user_id, status` (pending/accepted)
- `user_presence` — `user_id, last_seen_at` updated via heartbeat from `AuthContext`
- `get_recommended_users` RPC

**Recommendation logic:** Score = (shared tag count × 3) + (same location × 5) + (mutual connection × 2). Excludes existing connections. Returns top 10.

**UI:**
- **Home** — compact widget under the action row: "**3 friends online** · *tap to see who's around*" → `/profile#connections`. Empty-state CTA "Find people to debate with →" if zero connections.
- **Profile** — new "Connections" section, two tabs:
  - *Friends* — accepted connections, online dot, "Invite to debate" button
  - *Recommended* — cards explaining *why* ("Also interested in Politics, Climate" / "Also in Portland, OR")
- **Public profile route `/u/:handle`** — uses existing `get_public_profile` RPC, adds "Connect" button, lists user's public debates grouped by tag.

### 4. Pre-ship cleanup
- Strip mock arrays from `ExplorePage.tsx` in the same commit as wiring real queries (Explore is never empty between commits)
- Empty-state copy ("No public debates yet — be the first")
- Indexes on `debate_tags(tag_id)`, `live_session_tags(tag_id)`, `connections(user_id, status)`

---

## Technical notes

- New RPCs use `SECURITY DEFINER` with `search_path = public`, matching the security pattern we just established
- Presence: lightweight — heartbeat `last_seen_at` every 60s; "online" = within last 2 min. Avoids Realtime presence overhead.
- Tag dedup: `slug = lower(name).replace(/\s+/g,'-')` with a unique index
- `topic_category` (unused single-value column on `debates`) stays to avoid breaking types; new code uses `debate_tags` exclusively

---

## Four quick decisions before I build
<lov-tool-use id="toolu_vrtx_01QVDhrcoGDkcC1zn8nmm8Ph" name="questions--ask_questions" requires-approval="true" integration-id="questions" data="{\"questions\": [{\"header\":\"Tag limits\",\"question\":\"How many tags should a single debate or live session be allowed to carry?\",\"options\":[{\"label\":\"Up to 3 tags\",\"description\":\"Keeps Explore clean and forces users to pick what the conversation is really about. Recommended.\"},{\"label\":\"Up to 5 tags\",\"description\":\"More flexibility for cross-topic conversations (Politics + Environment + Economy).\"},{\"label\":\"Unlimited\",\"description\":\"Anything goes — risks tag spam and dilutes Explore quality.\"}]},{\"header\":\"Connection model\",\"question\":\"Should connections be mutual (Facebook-style friends) or one-way (Twitter-style follows)?\",\"options\":[{\"label\":\"Mutual (friends)\",\"description\":\"Both users must accept. Stronger trust signal, better fit for inviting people to private debates.\"},{\"label\":\"One-way (follow)\",\"description\":\"Anyone can follow anyone public. Faster network growth, more passive — closer to a social feed.\"},{\"label\":\"Both\",\"description\":\"Follow anyone publicly, but mutual 'friend' status unlocks invite-to-debate. Most flexible, more complex.\"}]},{\"header\":\"Tag moderation\",\"question\":\"Should user-created tags appear on Explore immediately, or only after a usage threshold?\",\"options\":[{\"label\":\"Immediate\",\"description\":\"Any new tag appears in 'More to Explore' right away. Maximum discoverability, risks clutter.\"},{\"label\":\"After 3 uses\",\"description\":\"Tags only surface on Explore once 3+ debates use them. Prevents one-off tags. Recommended.\"},{\"label\":\"Manual review\",\"description\":\"You approve community tags before they go public. Highest quality, but you become the bottleneck.\"}]},{\"header\":\"Presence privacy\",\"question\":\"Who should be able to see that a user is online?\",\"options\":[{\"label\":\"Only friends/connections\",\"description\":\"Privacy-first. Online dot only visible to accepted connections. Recommended.\"},{\"label\":\"Anyone with public profile\",\"description\":\"If your profile is public, your online status is too. More social, less private.\"},{\"label\":\"User toggleable\",\"description\":\"Add an 'Appear online' switch in profile settings, default to friends-only.\"}]}]}">
</lov-tool-use>
I keep accidentally calling `plan--create` — I shouldn't. The plan goes inline in my message inside `<lov-plan>` tags. Let me just deliver the response correctly now, and ask the questions in parallel.
<lov-tool-use id="toolu_vrtx_013m7LGU5hjKseVpiEmBgX7V" name="questions--ask_questions" requires-approval="true" integration-id="questions" data="{\"questions\": [{\"header\":\"Tag limits\",\"options\":[{\"description\":\"Keeps Explore clean and forces users to pick what the conversation is really about. Recommended.\",\"label\":\"Up to 3 tags\"},{\"description\":\"More flexibility for cross-topic conversations (Politics + Environment + Economy).\",\"label\":\"Up to 5 tags\"},{\"description\":\"Anything goes — risks tag spam and dilutes Explore quality.\",\"label\":\"Unlimited\"}],\"question\":\"How many tags should a single debate or live session be allowed to carry?\"},{\"header\":\"Connection model\",\"options\":[{\"description\":\"Both users must accept. Stronger trust signal, better fit for inviting people to private debates.\",\"label\":\"Mutual (friends)\"},{\"description\":\"Anyone can follow anyone public. Faster network growth, more passive — closer to a social feed.\",\"label\":\"One-way (follow)\"},{\"description\":\"Follow anyone publicly, but mutual 'friend' status unlocks invite-to-debate. Most flexible, more complex.\",\"label\":\"Both\"}],\"question\":\"Should connections be mutual (Facebook-style friends) or one-way (Twitter-style follows)?\"},{\"header\":\"Tag moderation\",\"options\":[{\"description\":\"Any new tag appears in 'More to Explore' right away. Maximum discoverability, risks clutter.\",\"label\":\"Immediate\"},{\"description\":\"Tags only surface on Explore once 3+ debates use them. Prevents one-off tags. Recommended.\",\"label\":\"After 3 uses\"},{\"description\":\"You approve community tags before they go public. Highest quality, but you become the bottleneck.\",\"label\":\"Manual review\"}],\"question\":\"Should user-created tags appear on Explore immediately, or only after a usage threshold?\"},{\"header\":\"Presence privacy\",\"options\":[{\"description\":\"Privacy-first. Online dot only visible to accepted connections. Recommended.\",\"label\":\"Only friends/connections\"},{\"description\":\"If your profile is public, your online status is too. More social, less private.\",\"label\":\"Anyone with public profile\"},{\"description\":\"Add an 'Appear online' switch in profile settings, default to friends-only.\",\"label\":\"User toggleable\"}],\"question\":\"Who should be able to see that a user is online?\"}]}">
</lov-tool-use>
The questions tool is being interrupted. Let me just deliver the plan as text — per instructions, ask_questions can be skipped if I bake the decisions into the plan with sensible defaults. The instructions say: after `