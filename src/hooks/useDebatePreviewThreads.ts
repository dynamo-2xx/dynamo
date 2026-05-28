import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PreviewSummary {
  id: string;
  side: string;
  content: string;
  type?: string;
  significance?: string;
  originalContent?: string;
  isEdited?: boolean;
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
      const labels = Array.from(new Set(sides.map((s) => s.label).filter(Boolean))).slice(0, 2);
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
        .select("id, subtopic_id, key_arguments")
        .eq("debate_id", debateId);
      if (cancelled) return;

      const bySub = new Map<string, { id: string; side: string; content: string; type?: string; significance?: string }[]>();
      // Track round_summary id + item_index so we can overlay per-item edits.
      const itemMeta = new Map<string, { roundSummaryId: string; itemIndex: number }>();
      (roundSummaries || []).forEach((rs: any) => {
        const items = ((rs.key_arguments as any[]) || [])
          .map((k, idx) => ({
            side: String(k?.side ?? "").trim(),
            content: String(k?.content ?? "").trim(),
            type: String(k?.type ?? "").trim(),
            significance: String(k?.significance ?? "").trim(),
            _idx: idx,
            _rsid: rs.id,
          }))
          .filter((k) => k.content);
        items.forEach((it) => {
          itemMeta.set(`${it._rsid}:${it._idx}`, {
            roundSummaryId: it._rsid,
            itemIndex: it._idx,
          });
        });
        const existing = bySub.get(rs.subtopic_id) || [];
        bySub.set(
          rs.subtopic_id,
          [
            ...existing,
            ...items.map((it) => ({
              id: `${it._rsid}:${it._idx}`,
              side: it.side,
              content: it.content,
              type: it.type,
              significance: it.significance,
            })),
          ],
        );
      });

      // Load per-item edits and build an overlay map keyed by rsid:idx.
      const editOverlay = new Map<string, { edited: string; original: string }>();
      const rsIds = (roundSummaries || []).map((rs: any) => rs.id);
      if (rsIds.length > 0) {
        const { data: editRows } = await supabase
          .from("round_summary_item_edits" as any)
          .select("round_summary_id, item_index, original_content, edited_content")
          .in("round_summary_id", rsIds);
        if (cancelled) return;
        (editRows as any[] | null)?.forEach((er) => {
          editOverlay.set(`${er.round_summary_id}:${er.item_index}`, {
            edited: String(er.edited_content ?? "").trim(),
            original: String(er.original_content ?? "").trim(),
          });
        });
      }

      // Re-walk bySub items so edited content overrides the original wording.
      (roundSummaries || []).forEach((rs: any) => {
        const list = bySub.get(rs.subtopic_id) || [];
        const next = list.map((it) => {
          const key = it.id;
          const edit = editOverlay.get(key);
          if (!edit) return it;
          return { ...it, content: edit.edited, _original: edit.original, _edited: true } as any;
        });
        bySub.set(rs.subtopic_id, next);
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
          const byTitle = new Map<string, { id: string; side: string; content: string; type?: string; significance?: string }[]>();
          map.forEach((e: any) => {
            const title = String(e?.subtopic ?? "").trim().toLowerCase();
            const subId = titleToId.get(title);
            if (!subId) return;
            const arr = byTitle.get(subId) || [];
            arr.push({
              id: String(e?.id ?? `${subId}:map:${arr.length}`),
              side: String(e?.speaker_side ?? "").trim(),
              content: String(e?.content ?? "").trim(),
              type: String(e?.type ?? "").trim(),
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
        items.forEach((it: any, idx) => {
          const key = it.side || "Unattributed";
          const arr = grouped.get(key) || [];
          arr.push({
            id: `${sub.id}:${idx}`,
            side: key,
            content: it.content,
            originalContent: it._original,
            isEdited: !!it._edited,
          });
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
