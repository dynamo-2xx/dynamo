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

      // Fallback: when no round_summaries are stored, reuse the live
      // debate_transcripts.argument_map so the post-session record matches what
      // viewers saw in the live argument map. Entries carry `subtopic` as a
      // title string — match by title.
      const subsMissing = baseSubs.filter((s) => !bySub.has(s.id));
      if (subsMissing.length > 0) {
        const { data: tx } = await supabase
          .from("debate_transcripts" as any)
          .select("argument_map")
          .eq("debate_id", debateId)
          .maybeSingle();
        if (cancelled) return;
        const map = ((tx as any)?.argument_map as any[]) || [];
        if (map.length > 0) {
          const titleToId = new Map<string, string>();
          subsMissing.forEach((s) => titleToId.set(s.title.trim().toLowerCase(), s.id));
          const byTitle = new Map<string, { side: string; content: string }[]>();
          map.forEach((e: any) => {
            const title = String(e?.subtopic ?? "").trim().toLowerCase();
            const subId = titleToId.get(title);
            if (!subId) return;
            const arr = byTitle.get(subId) || [];
            arr.push({
              side: String(e?.speaker_side ?? "").trim(),
              content: String(e?.content ?? "").trim(),
            });
            byTitle.set(subId, arr);
          });
          byTitle.forEach((items, subId) => {
            const filtered = items.filter((i) => i.content);
            if (filtered.length > 0) bySub.set(subId, filtered);
          });
        }
      }

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
