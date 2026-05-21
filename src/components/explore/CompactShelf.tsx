import CompactRecordCard from "./CompactRecordCard";
import EdgeArrow from "./EdgeArrow";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import type { ExploreDebate } from "@/hooks/useExplore";

interface Props {
  title: string;
  items: ExploreDebate[];
}

const CompactShelf = ({ title, items }: Props) => {
  const { ref, canLeft, canRight, scrollByCard } = useEdgeScroll<HTMLDivElement>();
  if (items.length === 0) return null;

  return (
    <section className="relative min-w-0">
      <div className="flex items-end justify-between mb-2.5 px-0.5">
        <h3 className="font-display text-lg sm:text-xl text-foreground">{title}</h3>
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

export default CompactShelf;