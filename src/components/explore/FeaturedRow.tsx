import { cn } from "@/lib/utils";
import { useFeaturedRow, type FeaturedScope } from "@/hooks/useFeaturedRow";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import FeaturedCard from "./FeaturedCard";
import EdgeArrow from "./EdgeArrow";

const FeaturedRow = () => {
  const { items, loading, scope, setScope, canUseLocal } = useFeaturedRow(12);
  const { ref, canLeft, canRight, scrollByCard } = useEdgeScroll<HTMLDivElement>();

  const Toggle = ({ value, label }: { value: FeaturedScope; label: string }) => {
    const active = scope === value;
    const disabled = value === "local" && !canUseLocal;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setScope(value)}
        title={disabled ? "Add your city in your profile to enable Local" : undefined}
        className={cn(
          "px-3.5 py-1.5 text-[12px] font-body rounded-full transition-colors",
          active
            ? "bg-foreground text-background"
            : "text-foreground/70 hover:text-foreground",
          disabled && "opacity-40 cursor-not-allowed hover:text-foreground/70",
        )}
      >
        {label}
      </button>
    );
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="font-display text-xl sm:text-2xl text-foreground">Featured</h2>
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full border border-border/60 bg-foreground/5 backdrop-blur-xl">
          <Toggle value="for_you" label="For You" />
          <Toggle value="local" label="Local" />
        </div>
      </div>

      <div className="relative min-w-0 overflow-hidden">
        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading && items.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="snap-start shrink-0 w-[78vw] sm:w-[44vw] md:w-[calc((100%-2rem)/3)] aspect-[16/10] rounded-xl bg-foreground/5 animate-pulse"
                />
              ))
            : items.map((d) => <FeaturedCard key={d.id} d={d} />)}
        </div>
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent transition-opacity ${canLeft ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent transition-opacity ${canRight ? "opacity-100" : "opacity-0"}`}
        />
        <EdgeArrow side="left" visible={canLeft} onClick={() => scrollByCard(-1)} />
        <EdgeArrow side="right" visible={canRight} onClick={() => scrollByCard(1)} />
      </div>
    </section>
  );
};

export default FeaturedRow;