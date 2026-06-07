import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePerformanceAnnotations, type PerfAnnotation } from "@/hooks/usePerformanceAnnotations";
import { useSubscription } from "@/hooks/useSubscription";
import type { Polarity } from "@/lib/perf-tags";

type SessionKind = "debate" | "cmm" | "live";

interface InsightsState {
  isPremium: boolean;
  /** Master toggle — when false, no underlines/pills render. */
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  /** Per-polarity filter. Empty set = show both. */
  activeFilters: Set<Polarity>;
  toggleFilter: (p: Polarity) => void;
  /** All annotations for this session, newest-first. */
  annotations: PerfAnnotation[];
  /** Annotations indexed by transcript_entry_id (filtered by active polarity). */
  byEntry: Map<string, PerfAnnotation[]>;
  counts: { positive: number; negative: number };
}

const Ctx = createContext<InsightsState | null>(null);

interface ProviderProps {
  sessionId: string;
  sessionKind: SessionKind;
  participantId?: string | null;
  children: ReactNode;
}

export function InsightsProvider({ sessionId, sessionKind, participantId, children }: ProviderProps) {
  const { tier } = useSubscription();
  const isPremium = tier !== "free";
  const { data } = usePerformanceAnnotations(
    isPremium ? sessionId : null,
    sessionKind,
    participantId ?? undefined,
  );
  const [enabled, setEnabled] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<Polarity>>(new Set());

  const value = useMemo<InsightsState>(() => {
    const filtered = activeFilters.size === 0
      ? data
      : data.filter((a) => a.polarity && activeFilters.has(a.polarity));
    const byEntry = new Map<string, PerfAnnotation[]>();
    for (const a of filtered) {
      if (!a.transcript_entry_id || !a.span_text || !a.polarity) continue;
      const arr = byEntry.get(a.transcript_entry_id) ?? [];
      arr.push(a);
      byEntry.set(a.transcript_entry_id, arr);
    }
    const counts = {
      positive: data.filter((a) => a.polarity === "positive").length,
      negative: data.filter((a) => a.polarity === "negative").length,
    };
    return {
      isPremium,
      enabled,
      setEnabled,
      activeFilters,
      toggleFilter: (p) => {
        setActiveFilters((prev) => {
          const n = new Set(prev);
          n.has(p) ? n.delete(p) : n.add(p);
          return n;
        });
      },
      annotations: data,
      byEntry,
      counts,
    };
  }, [isPremium, data, enabled, activeFilters]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInsights(): InsightsState | null {
  return useContext(Ctx);
}