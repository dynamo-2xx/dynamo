import { Search, Plus, CheckSquare, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type Filter = "all" | "drafts" | "published" | "trash";
export type Sort = "newest" | "oldest" | "session" | "annotations";

interface Props {
  filter: Filter;
  setFilter: (f: Filter) => void;
  counts: { all: number; drafts: number; published: number; trash: number };
  sort: Sort;
  setSort: (s: Sort) => void;
  query: string;
  setQuery: (q: string) => void;
  selectMode: boolean;
  toggleSelectMode: () => void;
  onCreateFolder: () => void;
}

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-1 rounded-full text-xs font-body whitespace-nowrap transition-colors border",
      active
        ? "bg-foreground text-background border-foreground"
        : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
    )}
  >
    {children}
  </button>
);

const sortLabels: Record<Sort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  session: "Session date",
  annotations: "Most annotations",
};

const StudyFilterBar = ({
  filter,
  setFilter,
  counts,
  sort,
  setSort,
  query,
  setQuery,
  selectMode,
  toggleSelectMode,
  onCreateFolder,
}: Props) => {
  return (
    <div className="space-y-3 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notebooks…"
          className="pl-9"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All · {counts.all}
        </Chip>
        <Chip active={filter === "drafts"} onClick={() => setFilter("drafts")}>
          Drafts · {counts.drafts}
        </Chip>
        <Chip active={filter === "published"} onClick={() => setFilter("published")}>
          Published · {counts.published}
        </Chip>
        <Chip active={filter === "trash"} onClick={() => setFilter("trash")}>
          Trash · {counts.trash}
        </Chip>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-xs font-body text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              ⌄ Sort: {sortLabels[sort]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {(Object.keys(sortLabels) as Sort[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setSort(s)}>
                {sortLabels[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateFolder}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New folder
          </button>
          <button
            type="button"
            onClick={toggleSelectMode}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body transition-colors border",
              selectMode
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:border-foreground/30",
            )}
          >
            {selectMode ? (
              <>
                <X className="w-3.5 h-3.5" /> Cancel
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" /> Select
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyFilterBar;