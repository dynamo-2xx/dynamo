import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PreviewStatement {
  id: string;
  kind: "main" | "counter" | "affirms" | "concedes" | "rebuttal";
  speakerLabel: string;
  text: string;
}

export interface PreviewThread {
  id: string;
  title: string;
  statements: PreviewStatement[];
}

export interface PreviewSubtopic {
  id: string;
  title: string;
  threads: PreviewThread[];
  /** Per-side AI key arguments (from round_summaries). Empty when not yet generated. */
  keyArguments: { side: string; content: string }[];
}

interface Args {
  debateId: string | undefined;
  status: string | undefined;
}

const AFFIRM_RX =
  /\b(i\s+agree|exactly|valid\s+point|you'?re\s+right|good\s+point|that'?s\s+true|agrees?\s+(with|that)|affirms?|supports?|in\s+agreement)\b/i;
const CONCEDE_RX =
  /\b(i\s+concede|fair\s+enough|point\s+taken|i'?ll\s+grant\s+you|concedes?\s+(point|argument|that)|yields?|acknowledges?|walks?\s+back)\b/i;

function classifyKind(
  argType: string | null,
  text: string,
  isRoot: boolean,
): PreviewStatement["kind"] {
  if (isRoot) return "main";
  if (AFFIRM_RX.test(text)) return "affirms";
  if (CONCEDE_RX.test(text)) return "concedes";
  if (argType === "rebuttal") return "rebuttal";
  return "counter";
}

/**
 * One-shot snapshot of a debate's threads/subtopics for the Explore preview.
 * - For scheduled / draft debates returns subtopic shells with no threads.
 * - For live debates groups arguments by subtopic and parent_argument_id chain.
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
        keyArguments: [],
      }));

      if (status !== "live" && status !== "completed") {
        setSubtopics(baseSubs);
        setLoading(false);
        return;
      }

      // Live/completed: fetch arguments + participants + AI round summaries
      const [{ data: args }, { data: parts }, { data: roundSummaries }] = await Promise.all([
        supabase
          .from("arguments")
          .select(
            "id, content, argument_type, parent_argument_id, participant_id, subtopic_id, created_at",
          )
          .eq("debate_id", debateId)
          .order("created_at", { ascending: true }),
        supabase
          .from("debate_participants")
          .select("id, side_id")
          .eq("debate_id", debateId),
        supabase
          .from("round_summaries")
          .select("subtopic_id, key_arguments")
          .eq("debate_id", debateId),
      ]);
      if (cancelled) return;

      const summariesBySubtopic = new Map<string, { side: string; content: string }[]>();
      (roundSummaries || []).forEach((rs: any) => {
        const items = ((rs.key_arguments as any[]) || [])
          .map((k) => ({ side: String(k?.side ?? ""), content: String(k?.content ?? "") }))
          .filter((k) => k.content);
        summariesBySubtopic.set(rs.subtopic_id, items);
      });

      const partSide = new Map<string, string | null>();
      (parts || []).forEach((p: any) => partSide.set(p.id, p.side_id));
      const sideIndex = new Map<string, number>();
      sides.forEach((s, i) => sideIndex.set(s.id, i));

      const argsBySubtopic = new Map<string, any[]>();
      (args || []).forEach((a: any) => {
        if (!a.subtopic_id) return;
        if (!argsBySubtopic.has(a.subtopic_id)) argsBySubtopic.set(a.subtopic_id, []);
        argsBySubtopic.get(a.subtopic_id)!.push(a);
      });

      const speakerLabelFor = (participantId: string | null): string => {
        const sid = participantId ? partSide.get(participantId) : null;
        const idx = sid ? sideIndex.get(sid) ?? 0 : 0;
        const sideLbl = labels[idx] || `Side ${idx + 1}`;
        return `Speaker ${idx + 1} · ${sideLbl}`;
      };

      const populated: PreviewSubtopic[] = baseSubs.map((sub) => {
        const subArgs = argsBySubtopic.get(sub.id) || [];
        const roots = subArgs.filter((a) => !a.parent_argument_id);
        const childrenOf = (parentId: string) =>
          subArgs.filter((a) => a.parent_argument_id === parentId);

        const threads: PreviewThread[] = roots.map((root, i) => {
          const chain: any[] = [root];
          let current = root;
          // Linear chain walk (one child per level — mirrors current debate UX).
          // If multiple, follow earliest.
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const kids = childrenOf(current.id);
            if (kids.length === 0) break;
            current = kids[0];
            chain.push(current);
          }
          const statements: PreviewStatement[] = chain.map((a, idx) => ({
            id: a.id,
            kind: classifyKind(a.argument_type, a.content || "", idx === 0),
            speakerLabel: speakerLabelFor(a.participant_id),
            text: a.content || "",
          }));
          const raw = (root.content || "").trim();
          // Use first sentence or 140 chars; the UI will wrap (no truncation).
          const firstSentence = raw.split(/(?<=[.!?])\s/)[0] || raw;
          const title = (firstSentence.length > 140 ? raw.slice(0, 140) + "…" : firstSentence) || `Thread ${i + 1}`;
          return { id: root.id, title, statements };
        });

        return { ...sub, threads, keyArguments: summariesBySubtopic.get(sub.id) || [] };
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