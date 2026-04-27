import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Search, ChevronRight, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useFeaturedDebates, useTrendingDebates, useLatestDebates, type ExploreDebate } from "@/hooks/useExplore";
import { useAllTags } from "@/hooks/useTags";

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { items: featured, loading: loadingFeatured } = useFeaturedDebates(2);
  const { items: trending } = useTrendingDebates(6);
  const { items: latest } = useLatestDebates(8);
  const { tags } = useAllTags();

  const visibleTags = useMemo(() => {
    // Official tags + community tags with at least 1 debate
    return tags.filter((t) => t.is_official || t.debate_count > 0).slice(0, 18);
  }, [tags]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return [...featured, ...trending, ...latest]
      .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)
      .filter((d) => d.topic.toLowerCase().includes(q));
  }, [searchQuery, featured, trending, latest]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="text-2xl sm:text-3xl font-display mb-6 sm:mb-8">Explore</h2>

          {/* Search */}
          <div className="relative mb-8 sm:mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search public debates…"
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-base sm:text-[13px] font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          {filtered ? (
            <div className="space-y-2 mb-12">
              {filtered.length === 0 ? (
                <EmptyState text={`No public debates match "${searchQuery}"`} />
              ) : (
                filtered.map((d) => <ListRow key={d.id} d={d} onClick={() => navigate(`/debate/${d.id}`)} />)
              )}
            </div>
          ) : (
            <>
              {/* Featured */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                {loadingFeatured ? (
                  <SkeletonHero />
                ) : featured.length === 0 ? (
                  <div className="md:col-span-2">
                    <EmptyState text="No public debates yet — be the first to publish one." />
                  </div>
                ) : (
                  featured.map((d, i) => <FeaturedCard key={d.id} d={d} index={i} onClick={() => navigate(`/debate/${d.id}`)} />)
                )}
              </div>

              {/* Trending */}
              <SectionHeader title="Trending" icon={<TrendingUp className="w-4 h-4" />} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-12">
                {trending.length === 0 ? (
                  <div className="sm:col-span-2 md:col-span-3">
                    <EmptyState text="Trending picks up as more public debates happen." />
                  </div>
                ) : (
                  trending.map((d, i) => (
                    <CompactCard key={d.id} d={d} rank={i + 1} onClick={() => navigate(`/debate/${d.id}`)} />
                  ))
                )}
              </div>

              {/* Latest */}
              <SectionHeader title="Latest" icon={<Sparkles className="w-4 h-4" />} />
              <div className="space-y-2 mb-12">
                {latest.length === 0 ? (
                  <EmptyState text="No recent public debates." />
                ) : (
                  latest.map((d) => <ListRow key={d.id} d={d} onClick={() => navigate(`/debate/${d.id}`)} />)
                )}
              </div>

              {/* Topics */}
              <SectionHeader title="More to Explore" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {visibleTags.length === 0 ? (
                  <div className="col-span-2 sm:col-span-3">
                    <EmptyState text="Tags will appear here once people start using them." />
                  </div>
                ) : (
                  visibleTags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/explore/topic/${t.slug}`)}
                      className="flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-background hover:border-foreground/20 transition-colors text-sm font-body font-medium text-foreground group cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        {t.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{t.debate_count}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

/* ── Sub-components ── */

const SectionHeader = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-4 w-fit">
    {icon}
    <h3 className="font-display text-lg">{title}</h3>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="border border-dashed border-border rounded-xl px-5 py-8 text-center text-sm text-muted-foreground font-body">
    {text}
  </div>
);

const SkeletonHero = () => (
  <>
    {[0, 1].map((i) => (
      <div key={i} className="rounded-xl border border-border bg-accent/30 min-h-[220px] animate-pulse" />
    ))}
  </>
);

const FeaturedCard = ({ d, index, onClick }: { d: ExploreDebate; index: number; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    onClick={onClick}
    className="relative group cursor-pointer rounded-xl overflow-hidden border border-border bg-accent/40 hover:border-foreground/20 transition-colors"
  >
    <div className="p-6 pb-8 flex flex-col justify-between min-h-[220px]">
      <div>
        {d.community_tag && (
          <span className="text-[10px] font-body font-medium uppercase tracking-wider text-muted-foreground">
            {d.community_tag}
          </span>
        )}
        {!d.community_tag && d.status === "live" && (
          <span className="text-[10px] font-body font-medium uppercase tracking-wider text-muted-foreground">LIVE</span>
        )}
        <h3 className="font-display text-lg mt-1 leading-snug">{d.topic}</h3>
      </div>
      <div className="mt-auto pt-4 flex items-center gap-3">
        {d.status === "live" && (
          <span className="flex items-center gap-1.5 text-[10px] font-body font-medium uppercase tracking-wider bg-[#dcfce7] text-[#166534] dark:bg-[#166534]/20 dark:text-[#4ade80] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-[#166534] dark:bg-[#4ade80] rounded-full animate-pulse" />
            Live
          </span>
        )}
        <span className="text-[11px] text-muted-foreground font-body">{d.participant_count} speakers</span>
        {d.publisher_name && (
          <span className="text-[11px] text-muted-foreground font-body truncate">· by {d.publisher_name}</span>
        )}
      </div>
    </div>
  </motion.div>
);

const CompactCard = ({ d, rank, onClick }: { d: ExploreDebate; rank: number; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors cursor-pointer bg-background group"
  >
    <span className="text-[10px] font-body text-muted-foreground font-medium">#{rank} Trending</span>
    <h4 className="font-display text-sm mt-1 leading-snug line-clamp-2">{d.topic}</h4>
    <div className="text-[11px] text-muted-foreground font-body mt-3">
      {d.participant_count} speakers · {new Date(d.created_at).toLocaleDateString()}
      {d.publisher_name ? ` · by ${d.publisher_name}` : ""}
    </div>
  </div>
);

const ListRow = ({ d, onClick }: { d: ExploreDebate; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="flex items-center gap-4 border border-border rounded-xl px-5 py-4 hover:border-foreground/20 transition-colors cursor-pointer bg-background group"
  >
    <div className="flex-1 min-w-0">
      <h4 className="font-display text-sm leading-snug truncate">{d.topic}</h4>
      <div className="text-[11px] text-muted-foreground font-body mt-1.5">
        {new Date(d.created_at).toLocaleDateString()} · {d.participant_count} speakers
        {d.publisher_name ? ` · by ${d.publisher_name}` : ""}
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </div>
);

export default ExplorePage;
