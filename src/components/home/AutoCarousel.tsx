import { useEffect, useRef, useState, ReactNode } from "react";
import EdgeArrow from "@/components/explore/EdgeArrow";

interface Props<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  intervalMs?: number;
  resumeAfterMs?: number;
}

function AutoCarousel<T>({
  items,
  renderItem,
  getKey,
  intervalMs = 5000,
  resumeAfterMs = 5000,
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const lastInteractionRef = useRef<number>(0);
  const [, force] = useState(0);

  const reduceMotion = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Auto-advance
  useEffect(() => {
    if (reduceMotion || items.length <= 1) return;
    const id = setInterval(() => {
      const sinceInteraction = Date.now() - lastInteractionRef.current;
      if (lastInteractionRef.current && sinceInteraction < resumeAfterMs) return;
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs, resumeAfterMs, reduceMotion]);

  // Sync DOM scroll to index
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const child = sc.children[index] as HTMLElement | undefined;
    if (child) {
      sc.scrollTo({ left: child.offsetLeft - sc.offsetLeft, behavior: "smooth" });
    }
  }, [index]);

  const markInteraction = () => {
    lastInteractionRef.current = Date.now();
    force((x) => x + 1);
  };

  const prev = () => {
    markInteraction();
    setIndex((i) => (i - 1 + items.length) % items.length);
  };
  const next = () => {
    markInteraction();
    setIndex((i) => (i + 1) % items.length);
  };

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground font-body">
        Nothing to show yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={markInteraction}
        onPointerDown={markInteraction}
        onFocus={markInteraction}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div
            key={getKey(item)}
            className="snap-start shrink-0 w-full md:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
          >
            {renderItem(item)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <EdgeArrow side="left" visible onClick={prev} />
          <EdgeArrow side="right" visible onClick={next} />
        </>
      )}
    </div>
  );
}

export default AutoCarousel;
