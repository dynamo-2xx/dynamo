import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Hash, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ClubCoverCard from "@/components/clubs/ClubCoverCard";
import ClubShelf from "@/components/clubs/ClubShelf";
import FloatingSearch from "@/components/explore/FloatingSearch";
import LegalFooter from "@/components/legal/LegalFooter";
import { useClubs, useClubTagShelves } from "@/hooks/useClubs";
import { useAllTags } from "@/hooks/useTags";
import { useAuth } from "@/contexts/AuthContext";

const ClubsPage = () => {
  const { user, profile } = useAuth();
  const { items, loading } = useClubs();
  const { tags: allTags } = useAllTags();
  const [q, setQ] = useState("");
  const [params, setParams] = useSearchParams();
  const tagSlug = params.get("tag");
  const activeTag = useMemo(
    () => (tagSlug ? allTags.find((t) => t.slug === tagSlug) || null : null),
    [allTags, tagSlug],
  );

  const query = q.trim().toLowerCase();
  const userLoc = (profile?.location || "").trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!query) return [];
    return items.filter((c) => {
      const hay = `${c.name} ${c.description || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [items, query]);

  const featured = useMemo(() => items.filter((c) => c.is_featured), [items]);
  const nearYou = useMemo(() => {
    if (!userLoc) return [];
    return items.filter((c) => {
      const loc = (c.location || "").toLowerCase();
      if (!loc) return false;
      return loc.includes(userLoc) || userLoc.includes(loc);
    });
  }, [items, userLoc]);
  const myClubs = useMemo(
    () => (user ? items.filter((c) => c.is_member) : []),
    [items, user],
  );
  const { shelves: tagShelves, untagged } = useClubTagShelves(items);

  const hasAnyShelf =
    featured.length + nearYou.length + myClubs.length + tagShelves.length + untagged.length > 0;

  const tagFiltered = useMemo(() => {
    if (!activeTag) return [];
    return items.filter((c) => c.primary_tag_id === activeTag.id);
  }, [items, activeTag]);

  return (
    <AppLayout>
      <FloatingSearch value={q} onChange={setQ} placeholder="Search clubs…" />
      <div className="max-w-7xl mx-auto min-w-0 px-4 sm:px-6 py-6 sm:py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-10"
        >
          <header className="pr-12 sm:pr-14 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl text-foreground">Clubs</h1>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Find communities to join, host, and debate with.
              </p>
            </div>
            {user && (
              <Link
                to="/clubs/new"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Club
              </Link>
            )}
          </header>

          {activeTag ? (
            <section>
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="font-display text-lg flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {activeTag.name}
                  <span className="text-[11px] text-muted-foreground font-body">
                    {tagFiltered.length}
                  </span>
                </h2>
                <button
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("tag");
                    setParams(next, { replace: true });
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-body"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
              {tagFiltered.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
                  No clubs are featured under #{activeTag.name} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-7">
                  {tagFiltered.map((c) => (
                    <ClubCoverCard key={c.id} c={c} />
                  ))}
                </div>
              )}
            </section>
          ) : query ? (
            <section>
              <h2 className="font-display text-lg mb-3">Results for “{q}”</h2>
              {searchResults.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
                  No clubs match “{q}”.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-7">
                  {searchResults.map((c) => (
                    <ClubCoverCard key={c.id} c={c} />
                  ))}
                </div>
              )}
            </section>
          ) : loading ? (
            <div className="text-sm text-muted-foreground font-body">Loading clubs…</div>
          ) : !hasAnyShelf ? (
            <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
              No clubs yet — be the first to create one.
            </div>
          ) : (
            <div className="space-y-9">
              <ClubShelf title="Featured" items={featured} />
              <ClubShelf title="Near you" items={nearYou} />
              <ClubShelf title="My Clubs" items={myClubs} />
              {tagShelves.map(({ tag, items: shelfItems }) => (
                <ClubShelf key={tag.id} title={`#${tag.name}`} items={shelfItems} />
              ))}
              <ClubShelf title="More clubs" items={untagged} />
            </div>
          )}
        </motion.div>
      </div>
      <LegalFooter />
    </AppLayout>
  );
};

export default ClubsPage;