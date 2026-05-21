import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
}

const EdgeArrow = ({ side, visible, onClick }: Props) => {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10",
        "w-10 h-10 rounded-full items-center justify-center",
        "bg-background/60 backdrop-blur-xl border border-border/60",
        "text-foreground/80 hover:text-foreground hover:bg-background/80",
        "shadow-[0_4px_16px_-4px_rgba(0,0,0,0.25)]",
        "transition-all duration-200",
        side === "left" ? "left-1" : "right-1",
        visible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={2.25} />
    </button>
  );
};

export default EdgeArrow;