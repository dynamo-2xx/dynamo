import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ExploreDebate } from "@/hooks/useExplore";

export type ExploreFormat = "debate" | "live" | "cmm" | "imported";
export const ALL_FORMATS: ExploreFormat[] = ["debate", "live", "cmm", "imported"];

const STORAGE_KEY = "explore.formats";

interface Ctx {
  formats: Set<ExploreFormat>;
  isAll: boolean;
  toggle: (f: ExploreFormat) => void;
  setAll: () => void;
  matches: (item: { kind?: string; status?: string; format?: string | null } | undefined | null) => boolean;
}

const ExploreFiltersContext = createContext<Ctx | null>(null);

function classify(item: { kind?: string; status?: string; format?: string | null }): ExploreFormat {
  if (item.kind === "imported_record") return "imported";
  if (item.kind === "live_session") return "live";
  if (item.format === "change_my_mind") return "cmm";
  if (item.status === "live") return "live";
  return "debate";
}

export function ExploreFiltersProvider({ children }: { children: ReactNode }) {
  const [formats, setFormats] = useState<Set<ExploreFormat>>(() => new Set(ALL_FORMATS));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ExploreFormat[];
      if (Array.isArray(parsed) && parsed.length) {
        const valid = parsed.filter((f) => ALL_FORMATS.includes(f));
        if (valid.length) setFormats(new Set(valid));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (s: Set<ExploreFormat>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s)));
    } catch {
      /* ignore */
    }
  };

  const setAll = useCallback(() => {
    const s = new Set(ALL_FORMATS);
    setFormats(s);
    persist(s);
  }, []);

  const toggle = useCallback((f: ExploreFormat) => {
    setFormats((prev) => {
      const isAllNow = prev.size === ALL_FORMATS.length;
      let next: Set<ExploreFormat>;
      if (isAllNow) {
        // From All-state, selecting one item filters down to only that one
        next = new Set([f]);
      } else {
        next = new Set(prev);
        if (next.has(f)) next.delete(f);
        else next.add(f);
        if (next.size === 0) next = new Set(ALL_FORMATS);
      }
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => {
    const isAll = formats.size === ALL_FORMATS.length;
    return {
      formats,
      isAll,
      toggle,
      setAll,
      matches: (item) => {
        if (!item) return true;
        if (isAll) return true;
        return formats.has(classify(item));
      },
    };
  }, [formats, toggle, setAll]);

  return <ExploreFiltersContext.Provider value={value}>{children}</ExploreFiltersContext.Provider>;
}

export function useExploreFilters(): Ctx {
  const ctx = useContext(ExploreFiltersContext);
  if (!ctx) {
    // Safe no-op fallback so components can render outside the provider
    return {
      formats: new Set(ALL_FORMATS),
      isAll: true,
      toggle: () => {},
      setAll: () => {},
      matches: () => true,
    };
  }
  return ctx;
}

export const FORMAT_LABELS: Record<ExploreFormat, string> = {
  debate: "Debates",
  live: "Live",
  cmm: "Change My Mind",
  imported: "Imported",
};