import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PreviewSummary {
  id: string;
  side: string;
  content: string;
}

export interface PreviewThread {
  id: string;
  title: string; // side label
  summaries: PreviewSummary[];
}

export interface PreviewSubtopic {
  id: string;
  title: string;
  threads: PreviewThread[];
  hasSummaries: boolean;
}

interface Args {
  debateId: string | undefined;
  status: string | undefined;
}

/**
 * Per-subtopic AI summary view: subtopic → thread (per side) → summaries.
 * Source: round_summaries.key_arguments. No transcript text is exposed here.
 */
export function useDebatePreviewThreads({ debateId, status }: Args) {
  const [subtopics, setSubtopics] = useState<PreviewSubtopic[]>([]);
  const [sideLabels, setSideLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!debateId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [{ data: subs }, { data: sds }] = await Promise.all([
        supabase
          .from("debate_subtopics")
          .select("id, title, sort_order")
          .eq("debate_id", debateId)
          .order("sort_order"),
        supabase
          .from("debate_sides")
          .select("id, label, sort_order")
          .eq("debate_id", debateId)
          .order("sort_order"),
      ]);
      if (cancelled) return;

      const sides = (sds || []) as Array<{ id: string; label: string; sort_order: number }>;
      const labels = sides.map((s) => s.label);
      setSideLabels(labels);

      const baseSubs: PreviewSubtopic[] = (subs || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        threads: [],
        hasSummaries: false,
      }));

      if (status !== "live" && status !== "completed") {
        setSubtopics(baseSubs);
        setLoading(false);
        return;
      }

      const { data: roundSummaries } = await supabase
        .from("round_summaries")
        .select("subtopic_id, key_arguments")
        .eq("debate_id", debateId);
      if (cancelled) return;

      const bySub = new Map<string, { side: string; content: string }[]>();
      (roundSummaries || []).forEach((rs: any) => {
        const items = ((rs.key_arguments as any[]) || [])
          .map((k) => ({
            side: String(k?.side ?? "").trim(),
            content: String(k?.content ?? "").trim(),
          }))
          .filter((k) => k.content);
        bySub.set(rs.subtopic_id, items);
      });

      const populated: PreviewSubtopic[] = baseSubs.map((sub) => {
        const items = bySub.get(sub.id) || [];
        if (items.length === 0) return { ...sub, threads: [], hasSummaries: false };

        // Group by side, ordered by sideLabels.
        const grouped = new Map<string, PreviewSummary[]>();
        items.forEach((it, idx) => {
          const key = it.side || "Unattributed";
          const arr = grouped.get(key) || [];
          arr.push({ id: `${sub.id}:${idx}`, side: key, content: it.content });
          grouped.set(key, arr);
        });

        const orderedSides = [
          ...labels.filter((l) => grouped.has(l)),
          ...Array.from(grouped.keys()).filter((k) => !labels.includes(k)),
        ];

        const threads: PreviewThread[] = orderedSides.map((sideLabel) => ({
          id: `${sub.id}:${sideLabel}`,
          title: sideLabel,
          summaries: grouped.get(sideLabel)!,
        }));

        return { ...sub, threads, hasSummaries: true };
      });

      setSubtopics(populated);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debateId, status]);

  return { subtopics, sideLabels, loading };
}
