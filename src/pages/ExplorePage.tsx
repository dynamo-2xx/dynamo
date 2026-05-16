import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import {
  useFeaturedDebates,
  useTrendingDebates,
  useLatestDebates,
  useDebatesByTag,
  type ExploreDebate,
} from "@/hooks/useExplore";
import { useAllTags } from "@/hooks/useTags";
import DebateCoverCard from "@/components/home/DebateCoverCard";
import { cn } from "@/lib/utils";
import LegalFooter from "@/components/legal/LegalFooter";

type ChipId = "all" | "live" | "today" | "latest" | `tag:${string}`;

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<ChipId>("all");

  const { items: featured } = useFeaturedDebates(6);
  const { items: trending } = useTrendingDebates(24);
  const { items: latest } = useLatestDebates(24);
  const { tags } = useAllTags();

  const visibleTags = useMemo(
    () => tags.filter((t) => t.is_official || t.debate_count > 0).slice(0, 24),
    [tags],
  );

  const activeTagId = activeChip.startsWith("tag:") ? activeChip.slice(4) : null;
  const { items: tagItems } = useDebatesByTag(activeTagId, 30);

  const allMerged = useMemo(() => {
    const seen = new Set<string>();
    return [...featured, ...trending, ...latest].filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [featured, trending, latest]);

  const chipResults: ExploreDebate[] = useMemo(() => {
    switch (activeChip) {
      case "all":
        return allMerged;
      case "live":
        return allMerged.filter((d) => d.status === "live");
      case "today":
        return trending;
      case "latest":
        return latest;
      default:
        return tagItems;
    }
  }, [activeChip, allMerged, trending, latest, tagItems]);

  const q = searchQuery.trim().toLowerCase();
  const displayed = q
    ? allMerged.filter((d) => d.topic.toLowerCase().includes(q))
    : chipResults;

  const builtinChips: { id: ChipId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "today", label: "For You" },
    { id: "latest", label: "Latest" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 md:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-display">Explore</h2>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search public debates…"
                className="w-full bg-background border border-border rounded-full pl-9 pr-4 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
              />
            </div>
          </div>

          {/* Chip bar */}
          {!q && (
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur -mx-4 px-4 py-3 mb-6 border-b border-border">
              <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {builtinChips.map((c) => (
                  <Chip
                    key={c.id}
                    active={activeChip === c.id}
                    onClick={() => setActiveChip(c.id)}
                    label={c.label}
                  />
                ))}
                {visibleTags.map((t) => {
                  const id: ChipId = `tag:${t.id}`;
                  return (
                    <Chip
                      key={t.id}
                      active={activeChip === id}
                      onClick={() => setActiveChip(id)}
                      label={`#${t.name}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid */}
          {displayed.length === 0 ? (
            <EmptyState
              text={
                q
                  ? `No public debates match "${searchQuery}"`
                  : "Nothing here yet — check back soon."
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-7">
              {displayed.map((d) => (
                <ExploreCard key={d.id} d={d} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <LegalFooter />
    </AppLayout>
  );
};

const Chip = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-body whitespace-nowrap transition-colors border",
      active
        ? "bg-foreground text-background border-foreground"
        : "bg-background text-foreground border-border hover:border-foreground/30",
    )}
  >
    {label}
  </button>
);

const ExploreCard = ({ d }: { d: ExploreDebate }) => (
  <div className="flex flex-col">
    <DebateCoverCard d={d} />
    <div className="mt-2.5 px-0.5">
      <div className="text-[12px] text-muted-foreground font-body truncate">
        {d.status === "live" ? (
          <span className="text-foreground font-medium">LIVE</span>
        ) : d.publisher_name ? (
          d.publisher_name
        ) : (
          "Anonymous"
        )}
        {typeof d.participant_count === "number" && d.participant_count > 0 && (
          <> · {d.participant_count} speaker{d.participant_count === 1 ? "" : "s"}</>
        )}
      </div>
    </div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
    {text}
  </div>
);

export default ExplorePage;
