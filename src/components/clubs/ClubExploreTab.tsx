import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, LayoutGrid, Search, X, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRecordTags } from "@/hooks/useTags";
import {
  useClubFeed,
  useClubPins,
  useClubRecords,
  type ClubRecord,
} from "@/hooks/useClubExplore";
import ClubRecordCard from "./ClubRecordCard";
import ClubTakeComposer from "./ClubTakeComposer";
import TakeCard from "@/components/explore/feed/TakeCard";
import FeedNotebookCard from "@/components/explore/feed/FeedNotebookCard";

interface Props {
  clubId: string;
  isMember: boolean;
  isAdmin: boolean;
}

const ClubExploreTab = ({ clubId, isMember, isAdmin }: Props) => {
  const { user } = useAuth();
  const [view, setView] = useState<"records" | "feed">("records");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { tags: clubTags } = useRecordTags("club", clubId);
  const { records, loading: recordsLoading } = useClubRecords(clubId);
  const recordIds = useMemo(() => records.map((r) => r.id), [records]);
  const { items: feedItems, loading: feedLoading, hasMore, loadMore, prepend } = useClubFeed(
    clubId,
    recordIds,
  );
  const { pins, pin, unpin } = useClubPins(clubId);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view !== "feed" || !sentinel.current) return;
    const el = sentinel.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && hasMore && !feedLoading) loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [view, hasMore, feedLoading, loadMore]);

  // Records: tag + search filter
  const visibleRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (activeTag && !(r.tag_ids || []).includes(activeTag)) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, search, activeTag]);

  // Pin lookup
  const pinByTarget = useMemo(() => {
    const m = new Map<string, string>();
    pins.forEach((p) => m.set(`${p.kind}:${p.target_id}`, p.id));
    return m;
  }, [pins]);

  const featuredRecords = useMemo(() => {
    const ids = new Set(pins.filter((p) => p.kind === "record").map((p) => p.target_id));
    return visibleRecords.filter((r) => ids.has(r.id));
  }, [visibleRecords, pins]);

  const groupedByStatus = useMemo(() => {
    const live: ClubRecord[] = [];
    const upcoming: ClubRecord[] = [];
    const past: ClubRecord[] = [];
    visibleRecords.forEach((r) => {
      if (r.status === "live") live.push(r);
      else if (r.status === "scheduled" || r.status === "draft") upcoming.push(r);
      else past.push(r);
    });
    return { live, upcoming, past };
  }, [visibleRecords]);

  const togglePinRecord = async (r: ClubRecord) => {
    if (!user) return;
    const existing = pinByTarget.get(`record:${r.id}`);
    if (existing) await unpin(existing);
    else await pin("record", r.id, user.id);
  };

  const visibleFeed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return feedItems;
    return feedItems.filter((it) => {
      if (it.kind === "take") return it.data.body.toLowerCase().includes(q);
      const text =
        (it.data.publish_caption || "") +
        " " +
        (it.data.display_title || "") +
        " " +
        (it.data.my_take || "");
      return text.toLowerCase().includes(q);
    });
  }, [feedItems, search]);

  return (
    <div className="space-y-5">
      {/* Inline controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-full border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setView("records")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-9 text-xs font-body transition-colors",
              view === "records"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Records
          </button>
          <button
            type="button"
            onClick={() => setView("feed")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-9 text-xs font-body transition-colors",
              view === "feed"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BookOpen className="w-3.5 h-3.5" /> Feed
          </button>
        </div>

        <div className="flex items-center flex-1 min-w-[180px] max-w-sm h-9 rounded-full border border-border px-3">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={view === "records" ? "Search records…" : "Search posts…"}
            className="flex-1 bg-transparent border-0 outline-none px-2 text-xs font-body text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Clear"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tag filter chips (records view only) */}
      {view === "records" && clubTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-body transition-colors border",
              activeTag === null
                ? "bg-foreground text-background border-foreground"
                : "border-border text-foreground hover:border-foreground/40",
            )}
          >
            All
          </button>
          {clubTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTag(t.id)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-body transition-colors border",
                activeTag === t.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-foreground hover:border-foreground/40",
              )}
            >
              <Hash className="w-3 h-3" />
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Records view */}
      {view === "records" && (
        <div className="space-y-8">
          {featuredRecords.length > 0 && (
            <section>
              <h3 className="text-sm font-body font-medium mb-3">Featured</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {featuredRecords.map((r) => (
                  <ClubRecordCard
                    key={`f-${r.id}`}
                    r={r}
                    pinned
                    canPin={isAdmin}
                    onTogglePin={() => togglePinRecord(r)}
                  />
                ))}
              </div>
            </section>
          )}

          {recordsLoading && (
            <p className="text-sm text-muted-foreground font-body">Loading records…</p>
          )}

          {!recordsLoading && visibleRecords.length === 0 && (
            <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
              No records yet. Create an event to spawn this club's first record.
            </div>
          )}

          {groupedByStatus.live.length > 0 && (
            <Section title="Live now" records={groupedByStatus.live} isAdmin={isAdmin} pinByTarget={pinByTarget} onTogglePin={togglePinRecord} />
          )}
          {groupedByStatus.upcoming.length > 0 && (
            <Section title="Upcoming" records={groupedByStatus.upcoming} isAdmin={isAdmin} pinByTarget={pinByTarget} onTogglePin={togglePinRecord} />
          )}
          {groupedByStatus.past.length > 0 && (
            <Section title="Completed" records={groupedByStatus.past} isAdmin={isAdmin} pinByTarget={pinByTarget} onTogglePin={togglePinRecord} />
          )}
        </div>
      )}

      {/* Feed view */}
      {view === "feed" && (
        <div className="max-w-[640px] mx-auto">
          {isMember ? (
            <div className="mb-5">
              <ClubTakeComposer clubId={clubId} onPublished={prepend} />
            </div>
          ) : (
            <div className="mb-5 border border-dashed border-border rounded-xl px-4 py-3 text-sm text-muted-foreground font-body">
              Join the club to post a take here.
            </div>
          )}

          <div className="space-y-3">
            {visibleFeed.map((it) =>
              it.kind === "take" ? (
                <TakeCard key={`t-${it.data.id}`} take={it.data} />
              ) : (
                <FeedNotebookCard key={`n-${it.data.id}`} notebook={it.data} />
              ),
            )}

            {!feedLoading && visibleFeed.length === 0 && (
              <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
                Nothing posted to this club yet. {isMember ? "Be the first." : ""}
              </div>
            )}

            <div ref={sentinel} aria-hidden className="h-8" />
            {feedLoading && (
              <p className="text-center text-xs text-muted-foreground font-body py-4">
                Loading…
              </p>
            )}
            {!hasMore && visibleFeed.length > 0 && (
              <p className="text-center text-xs text-muted-foreground font-body py-4">
                You've reached the end.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({
  title,
  records,
  isAdmin,
  pinByTarget,
  onTogglePin,
}: {
  title: string;
  records: ClubRecord[];
  isAdmin: boolean;
  pinByTarget: Map<string, string>;
  onTogglePin: (r: ClubRecord) => void;
}) => (
  <section>
    <h3 className="text-sm font-body font-medium mb-3">{title}</h3>
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {records.map((r) => (
        <ClubRecordCard
          key={r.id}
          r={r}
          pinned={pinByTarget.has(`record:${r.id}`)}
          canPin={isAdmin}
          onTogglePin={() => onTogglePin(r)}
        />
      ))}
    </div>
  </section>
);

export default ClubExploreTab;