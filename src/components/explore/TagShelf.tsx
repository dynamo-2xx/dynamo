import { Link } from "react-router-dom";
import CompactRecordCard from "./CompactRecordCard";
import EdgeArrow from "./EdgeArrow";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import type { ExploreDebate } from "@/hooks/useExplore";
import type { Tag } from "@/hooks/useTags";

interface Props {
  tag: Tag;
  items: ExploreDebate[];
}

const TagShelf = ({ tag, items }: Props) => {
  const { ref, canLeft, canRight, scrollByCard } = useEdgeScroll<HTMLDivElement>();

  if (items.length === 0) return null;

  return (
    <section className="relative min-w-0">
      <div className="flex items-baseline gap-3 mb-2.5 px-0.5">
        <Link
          to={`/explore/topic/${tag.slug}`}
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
          to={`/explore/topic/${tag.slug}`}
          className="text-[12px] font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          See all →
        </Link>
      </div>
      <div className="relative min-w-0 overflow-hidden">
        <div
          ref={ref}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((d) => (
            <div key={d.id} className="snap-start">
              <CompactRecordCard d={d} />
            </div>
          ))}
        </div>
        {/* Edge fades so partial cards melt into background */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent transition-opacity ${canLeft ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent transition-opacity ${canRight ? "opacity-100" : "opacity-0"}`}
        />
        <EdgeArrow side="left" visible={canLeft} onClick={() => scrollByCard(-1)} />
        <EdgeArrow side="right" visible={canRight} onClick={() => scrollByCard(1)} />
      </div>
    </section>
  );
};

export default TagShelf;