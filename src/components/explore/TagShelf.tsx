import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CompactRecordCard from "./CompactRecordCard";
import type { ExploreDebate } from "@/hooks/useExplore";
import type { Tag } from "@/hooks/useTags";

interface Props {
  tag: Tag;
  items: ExploreDebate[];
}

const TagShelf = ({ tag, items }: Props) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    sc.scrollBy({ left: dir * sc.clientWidth * 0.8, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="relative">
      <div className="flex items-end justify-between mb-2.5 px-0.5">
        <Link
          to={`/topic/${tag.slug}`}
          className="group flex items-baseline gap-2"
        >
          <h3 className="font-display text-lg sm:text-xl text-foreground group-hover:opacity-70 transition-opacity">
            #{tag.name}
          </h3>
          <span className="text-[11px] text-muted-foreground font-body">
            {items.length}
          </span>
        </Link>
        <Link
          to={`/topic/${tag.slug}`}
          className="text-[12px] font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          See all →
        </Link>
      </div>
      <div className="relative group">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto snap-x scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((d) => (
            <div key={d.id} className="snap-start">
              <CompactRecordCard d={d} />
            </div>
          ))}
        </div>
        {items.length > 4 && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Scroll left"
              className="hidden sm:flex absolute left-1 top-[40%] -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 border border-border items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Scroll right"
              className="hidden sm:flex absolute right-1 top-[40%] -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 border border-border items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default TagShelf;