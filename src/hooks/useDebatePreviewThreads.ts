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
      }));

      if (status !== "live") {
        setSubtopics(baseSubs);
        setLoading(false);
        return;
      }

      // Live: fetch arguments + participants to map side
      const [{ data: args }, { data: parts }] = await Promise.all([
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
      ]);
      if (cancelled) return;

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
          const title =
            (root.content || "").slice(0, 80).trim() || `Thread ${i + 1}`;
          return { id: root.id, title, statements };
        });

        return { ...sub, threads };
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