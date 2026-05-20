import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ClubCoverCard from "@/components/clubs/ClubCoverCard";
import { useClubs } from "@/hooks/useClubs";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type ChipId = "all" | "mine" | "public" | "private";

const ClubsPage = () => {
  const { user } = useAuth();
  const { items, loading } = useClubs();
  const [chip, setChip] = useState<ChipId>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = items;
    if (chip === "mine") list = list.filter((c) => c.is_member);
    else if (chip === "public") list = list.filter((c) => c.is_public);
    else if (chip === "private") list = list.filter((c) => !c.is_public);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((c) => c.name.toLowerCase().includes(s));
    return list;
  }, [items, chip, q]);

  const featured = useMemo(
    () => (q || chip !== "all" ? [] : items.filter((c) => c.is_featured).slice(0, 6)),
    [items, q, chip],
  );

  const chips: { id: ChipId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "mine", label: "My Clubs" },
    { id: "public", label: "Public" },
    { id: "private", label: "Private" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 md:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-display">Clubs</h2>
            <div className="flex items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search clubs…"
                  className="w-full bg-background border border-border rounded-full pl-9 pr-4 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
                />
              </div>
              {user && (
                <Link
                  to="/clubs/new"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-foreground text-background text-xs font-body font-medium whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Club
                </Link>
              )}
            </div>
          </div>

          {!q && (
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur -mx-4 px-4 py-3 mb-6 border-b border-border">
              <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {chips.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChip(c.id)}
                    className={cn(
                      "shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-body whitespace-nowrap transition-colors border",
                      chip === c.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border hover:border-foreground/30",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-muted-foreground font-body">Loading clubs…</div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
              {q ? `No clubs match "${q}"` : "No clubs yet — be the first to create one."}
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <div className="mb-8">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-3">Featured</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-7">
                    {featured.map((c) => (
                      <ClubCoverCard key={`feat-${c.id}`} c={c} />
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-7">
                {filtered.map((c) => (
                  <ClubCoverCard key={c.id} c={c} />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ClubsPage;