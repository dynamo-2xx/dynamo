import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AgendaFormat = "debate" | "live" | "cmm" | "imported";
export const ALL_AGENDA_FORMATS: AgendaFormat[] = ["debate", "live", "cmm", "imported"];

const STORAGE_KEY = "agenda.formats";

interface Ctx {
  formats: Set<AgendaFormat>;
  isAll: boolean;
  toggle: (f: AgendaFormat) => void;
  setAll: () => void;
  matches: (item: { kind?: string; format?: string | null }) => boolean;
}

const MyAgendaFiltersContext = createContext<Ctx | null>(null);

function classify(item: { kind?: string; format?: string | null }): AgendaFormat {
  if (item.kind === "imported_record") return "imported";
  if (item.kind === "live_session") return "live";
  if (item.format === "change_my_mind") return "cmm";
  return "debate";
}

export function MyAgendaFiltersProvider({ children }: { children: ReactNode }) {
  const [formats, setFormats] = useState<Set<AgendaFormat>>(() => new Set(ALL_AGENDA_FORMATS));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AgendaFormat[];
      if (Array.isArray(parsed) && parsed.length) {
        const valid = parsed.filter((f) => ALL_AGENDA_FORMATS.includes(f));
        if (valid.length) setFormats(new Set(valid));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (s: Set<AgendaFormat>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s)));
    } catch {
      /* ignore */
    }
  };

  const setAll = useCallback(() => {
    const s = new Set(ALL_AGENDA_FORMATS);
    setFormats(s);
    persist(s);
  }, []);

  const toggle = useCallback((f: AgendaFormat) => {
    setFormats((prev) => {
      const isAllNow = prev.size === ALL_AGENDA_FORMATS.length;
      let next: Set<AgendaFormat>;
      if (isAllNow) {
        next = new Set([f]);
      } else {
        next = new Set(prev);
        if (next.has(f)) next.delete(f);
        else next.add(f);
        if (next.size === 0) next = new Set(ALL_AGENDA_FORMATS);
      }
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => {
    const isAll = formats.size === ALL_AGENDA_FORMATS.length;
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

  return <MyAgendaFiltersContext.Provider value={value}>{children}</MyAgendaFiltersContext.Provider>;
}

export function useMyAgendaFilters(): Ctx {
  const ctx = useContext(MyAgendaFiltersContext);
  if (!ctx) {
    return {
      formats: new Set(ALL_AGENDA_FORMATS),
      isAll: true,
      toggle: () => {},
      setAll: () => {},
      matches: () => true,
    };
  }
  return ctx;
}

export const AGENDA_FORMAT_LABELS: Record<AgendaFormat, string> = {
  debate: "Debates",
  live: "Live",
  cmm: "Change My Mind",
  imported: "Imported",
};