import { BookOpen, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  view: "records" | "feed";
  onToggle: () => void;
}

const FloatingViewToggle = ({ view, onToggle }: Props) => {
  const isFeed = view === "feed";
  const Icon = isFeed ? LayoutGrid : BookOpen;
  const label = isFeed ? "Switch to records view" : "Switch to feed view";
  return (
    <div className="fixed top-[60px] right-3 sm:top-[68px] sm:right-4 z-40">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onToggle}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          "bg-background/90 backdrop-blur-md border border-border shadow-sm",
          "text-foreground hover:bg-muted transition-colors",
        )}
      >
        <Icon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default FloatingViewToggle;