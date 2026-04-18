import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useMyRecentDebates } from "@/hooks/useHomeDebates";
import DebateCoverCard from "@/components/home/DebateCoverCard";
import AppLayout from "@/components/AppLayout";

const INITIAL_VISIBLE = 12;

const MyRecentPage = () => {
  const { items, loading, removeItem, patchItem } = useMyRecentDebates(60);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, INITIAL_VISIBLE);
  const hasMore = items.length > INITIAL_VISIBLE;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <Link
            to="/my-debates"
            className="text-sm font-body text-foreground hover:underline"
          >
            My Agenda →
          </Link>
        </div>

        <h1 className="text-[24px] font-display mb-5">My Recent</h1>

        {loading ? (
          <p className="text-muted-foreground text-sm font-body">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm font-body py-12 text-center">
            You haven't joined or created any debates yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((d) => (
                <DebateCoverCard
                  key={d.id}
                  d={d}
                  onChanged={(action, id, patch) => {
                    if (action === "removed") removeItem(id);
                    else if (action === "updated" && patch) patchItem(id, patch);
                  }}
                />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center">
              {hasMore && !showAll ? (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm font-body px-4 py-2 rounded-full border border-border hover:border-foreground/40 transition-colors"
                >
                  See all ({items.length})
                </button>
              ) : (
                <span className="text-xs text-muted-foreground font-body">
                  Showing {visible.length} of {items.length}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default MyRecentPage;
