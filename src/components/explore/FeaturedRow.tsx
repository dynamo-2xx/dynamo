import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeaturedRow, type FeaturedScope } from "@/hooks/useFeaturedRow";
import FeaturedCard from "./FeaturedCard";

const FeaturedRow = () => {
  const { items, loading, scope, setScope, canUseLocal } = useFeaturedRow(12);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollNext = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-featured-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: step, behavior: "smooth" });
  };

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
    <section>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="font-display text-xl sm:text-2xl text-foreground">Featured</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full border border-border/60 bg-foreground/5 backdrop-blur-xl">
            <Toggle value="for_you" label="For You" />
            <Toggle value="local" label="Local" />
          </div>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next"
            className="w-9 h-9 rounded-full border border-border/60 bg-foreground/5 backdrop-blur-xl flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto snap-x scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading && items.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[78vw] sm:w-[44vw] md:w-[calc((100%-2rem)/3)] aspect-[16/10] rounded-xl bg-foreground/5 animate-pulse"
              />
            ))
          : items.map((d) => (
              <div key={d.id} data-featured-card className="contents">
                <FeaturedCard d={d} />
              </div>
            ))}
      </div>
    </section>
  );
};

export default FeaturedRow;