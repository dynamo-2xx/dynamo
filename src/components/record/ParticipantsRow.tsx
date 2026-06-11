import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import SidePill, { type SidePillProps } from "./SidePill";

interface ParticipantsRowProps {
  pills: SidePillProps[];
}

/**
 * Renders side / user pills with the layout rules:
 *  - 1–2 → single row, 2 columns
 *  - 3–4 → wraps to 2×2
 *  - 5+  → horizontal scroll-snap row with edge arrows
 */
const ParticipantsRow = ({ pills }: ParticipantsRowProps) => {
  const overflow = pills.length >= 5;
  const { ref, canLeft, canRight, scrollByCard } = useEdgeScroll<HTMLDivElement>();

  if (pills.length === 0) return null;

  if (!overflow) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {pills.map((p, i) => (
          <SidePill key={i} {...p} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {pills.map((p, i) => (
          <div key={i} className="snap-start shrink-0 w-[calc(50%-0.375rem)] sm:w-[220px]">
            <SidePill {...p} />
          </div>
        ))}
      </div>
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-foreground/[0.04] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-foreground/[0.04] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ParticipantsRow;