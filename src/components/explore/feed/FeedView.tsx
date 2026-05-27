import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useFeed, type FeedMode } from "@/hooks/useFeed";
import TakeComposer from "./TakeComposer";
import TakeCard from "./TakeCard";
import FeedNotebookCard from "./FeedNotebookCard";

const Tab = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-sm font-body transition-colors",
      active
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const FeedView = () => {
  const [mode, setMode] = useState<FeedMode>("for_you");
  const { items, loading, hasMore, loadMore, prepend } = useFeed(mode);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinel.current) return;
    const el = sentinel.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && hasMore && !loading) loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <div className="max-w-[640px] mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex items-center gap-1 mb-4">
        <Tab active={mode === "for_you"} onClick={() => setMode("for_you")}>
          For you
        </Tab>
        <Tab active={mode === "local"} onClick={() => setMode("local")}>
          Local
        </Tab>
      </div>

      <div className="mb-5">
        <TakeComposer onPublished={prepend} />
      </div>

      <div className="space-y-3">
        {items.map((it) =>
          it.kind === "take" ? (
            <TakeCard key={`t-${it.data.id}`} take={it.data} />
          ) : (
            <FeedNotebookCard key={`n-${it.data.id}`} notebook={it.data} />
          ),
        )}

        {!loading && items.length === 0 && (
          <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
            {mode === "for_you"
              ? "Follow people or publish a take to see this feed light up."
              : "Nobody nearby is publishing yet. Try For you, or set your location in your profile."}
          </div>
        )}

        <div ref={sentinel} aria-hidden className="h-8" />

        {loading && (
          <p className="text-center text-xs text-muted-foreground font-body py-4">
            Loading…
          </p>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-center text-xs text-muted-foreground font-body py-4">
            You've reached the end.
          </p>
        )}
      </div>
    </div>
  );
};

export default FeedView;