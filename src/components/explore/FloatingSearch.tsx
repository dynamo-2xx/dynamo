import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const FloatingSearch = ({ value, onChange }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (value) setExpanded(true);
  }, [value]);

  const collapse = () => {
    if (!value) setExpanded(false);
  };

  return (
    <div
      className={cn(
        "fixed top-3 left-3 sm:top-4 sm:left-4 z-40 transition-all duration-200",
      )}
    >
      <div
        className={cn(
          "flex items-center bg-background/90 backdrop-blur-md border border-border rounded-full shadow-sm transition-all",
          expanded ? "w-[260px] sm:w-[320px] pl-3 pr-1" : "w-10 h-10 justify-center",
        )}
      >
        {expanded ? (
          <>
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={collapse}
              placeholder="Search public debates…"
              className="flex-1 bg-transparent border-0 outline-none px-2 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="button"
              aria-label="Close search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange("");
                setExpanded(false);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            aria-label="Open search"
            onClick={() => setExpanded(true)}
            className="w-full h-full flex items-center justify-center text-foreground"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FloatingSearch;