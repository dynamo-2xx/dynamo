import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ALL_FORMATS,
  FORMAT_LABELS,
  useExploreFilters,
  type ExploreFormat,
} from "@/contexts/ExploreFiltersContext";

const FormatFilter = () => {
  const { formats, isAll, toggle, setAll } = useExploreFilters();

  const label = (() => {
    if (isAll) return "All formats";
    const selected = ALL_FORMATS.filter((f) => formats.has(f));
    if (selected.length === 1) return FORMAT_LABELS[selected[0]];
    return `${FORMAT_LABELS[selected[0]]} +${selected.length - 1}`;
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-body rounded-full border border-border/60 bg-foreground/5 backdrop-blur-xl text-foreground/80 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
      >
        <span>{label}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuCheckboxItem
          checked={isAll}
          onCheckedChange={() => setAll()}
          onSelect={(e) => e.preventDefault()}
        >
          All
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {ALL_FORMATS.map((f) => (
          <DropdownMenuCheckboxItem
            key={f}
            checked={!isAll && formats.has(f)}
            onCheckedChange={() => toggle(f as ExploreFormat)}
            onSelect={(e) => e.preventDefault()}
          >
            {FORMAT_LABELS[f]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FormatFilter;