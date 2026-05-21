import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import {
  useFeaturedDebates,
  useTrendingDebates,
  useLatestDebates,
} from "@/hooks/useExplore";
import { useTagShelves } from "@/hooks/useTagShelves";
import LegalFooter from "@/components/legal/LegalFooter";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import FloatingSearch from "@/components/explore/FloatingSearch";
import FeaturedHero from "@/components/explore/FeaturedHero";
import TagShelf from "@/components/explore/TagShelf";
import CompactRecordCard from "@/components/explore/CompactRecordCard";

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  useDocumentMeta({
    title: "Explore Debates — Dynamo",
    description:
      "Discover live debates, trending topics, and the best public records on Dynamo. Bring people to the power.",
    type: "website",
    canonical:
      typeof window !== "undefined" ? `${window.location.origin}/explore` : undefined,
  });

  const { items: featured } = useFeaturedDebates(1);
  const { items: trending } = useTrendingDebates(24);
  const { items: latest } = useLatestDebates(24);
  const { shelves } = useTagShelves(16);

  const hero = featured[0] || trending[0] || latest[0];

  const allMerged = useMemo(() => {
    const seen = new Set<string>();
    return [...trending, ...latest, ...shelves.flatMap((s) => s.items)].filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [trending, latest, shelves]);

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? allMerged.filter((d) => d.topic.toLowerCase().includes(q))
    : [];

  return (
    <AppLayout>
      <FloatingSearch value={searchQuery} onChange={setSearchQuery} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-10"
        >
          <header className="pr-12 sm:pr-14">
            <h1 className="font-display text-3xl sm:text-4xl text-foreground">
              Explore
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Browse live rooms, completed records, and topics you can join.
            </p>
          </header>

          {q ? (
            <section>
              <h2 className="font-display text-lg mb-3">
                Results for “{searchQuery}”
              </h2>
              {searchResults.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
                  No public debates match “{searchQuery}”.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-5">
                  {searchResults.map((d) => (
                    <CompactRecordCard key={d.id} d={d} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {hero && <FeaturedHero d={hero} />}

              <div className="space-y-9">
                {shelves.map(({ tag, items }) => (
                  <TagShelf key={tag.id} tag={tag} items={items} />
                ))}

                {latest.length > 0 && (
                  <section>
                    <div className="flex items-end justify-between mb-2.5 px-0.5">
                      <h3 className="font-display text-lg sm:text-xl text-foreground">
                        Latest
                      </h3>
                    </div>
                    <div className="flex gap-3 overflow-x-auto snap-x scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {latest.map((d) => (
                        <div key={d.id} className="snap-start">
                          <CompactRecordCard d={d} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {shelves.length === 0 && latest.length === 0 && (
                  <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
                    Nothing here yet — check back soon.
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
      <LegalFooter />
    </AppLayout>
  );
};

export default ExplorePage;
