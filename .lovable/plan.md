## Replace user-facing "Trending" with "Today"

Swap the visible word "Trending" → "Today" in three pages. Internal code identifiers (`mode === "trending"`, `useTrendingDebates`, `TrendingUp` icon) stay unchanged — only the rendered strings change.

### Changes

**`src/pages/HomePage.tsx`**
- Line 119: button label `Trending` → `Today`
- Line 140: empty state `"No local conversations yet. Try Trending."` → `"No local conversations yet. Try Today."`

**`src/pages/ForYouPage.tsx`**
- Line 174: toggle button label `Trending` → `Today`

**`src/pages/ExplorePage.tsx`**
- Line 71: comment `{/* Trending */}` → `{/* Today */}`
- Line 72: `<SectionHeader title="Trending" …/>` → `title="Today"`
- Line 76: empty state `"Trending picks up as more public debates happen."` → `"Today picks up as more public debates happen."`
- Line 190: `#{rank} Trending` → `#{rank} Today`

No logic, hooks, routes, or types change.
