import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GradeTurnArgs {
  debateId: string;
  participantId: string;
  userId: string;
  subtopicId: string | null;
  turnIndex: number;
  topic: string;
  subtopic: string;
  side: string;
  content: string;
  opposingArguments: Array<{ side: string; content: string }>;
  includeResolution: boolean;
}

interface GradeFinalArgs {
  debateId: string;
  participantId: string;
  userId: string;
  topic: string;
  side: string;
  allTurns: Array<{ subtopic: string; content: string }>;
  opposingTurns: Array<{ subtopic: string; side: string; content: string }>;
  includeResolution: boolean;
}

/**
 * Grading hook. Each call is fire-and-forget but tracks in-flight keys to dedupe.
 * - Per-turn grading: invoked once per (participantId + subtopicId + turnIndex).
 * - Final grading: invoked once per participantId per debate.
 *
 * RLS: only authenticated participants/creators can insert into debate_grades.
 */
export function useGrading() {
  const inflightTurnRef = useRef<Set<string>>(new Set());
  const inflightFinalRef = useRef<Set<string>>(new Set());

  const gradeTurn = useCallback(async (args: GradeTurnArgs) => {
    const key = `${args.participantId}|${args.subtopicId ?? "_"}|${args.turnIndex}`;
    if (inflightTurnRef.current.has(key)) return;
    inflightTurnRef.current.add(key);

    try {
      // Skip empty content — nothing to grade.
      if (!args.content || args.content.trim().length < 8) return;

      const { data, error } = await supabase.functions.invoke("ai-facilitator", {
        body: {
          action: "grade_turn",
          payload: {
            topic: args.topic,
            subtopic: args.subtopic,
            side: args.side,
            content: args.content,
            opposingArguments: args.opposingArguments,
            includeResolution: args.includeResolution,
          },
        },
      });
      if (error) throw error;
      if (!data) return;

      await supabase.from("debate_grades" as any).insert({
        debate_id: args.debateId,
        participant_id: args.participantId,
        user_id: args.userId,
        subtopic_id: args.subtopicId,
        turn_index: args.turnIndex,
        grade_kind: "turn",
        argument_quality: data.argument_quality ?? null,
        opposition_engagement: data.opposition_engagement ?? null,
        clarity_structure: data.clarity_structure ?? null,
        stakes_articulation: data.stakes_articulation ?? null,
        overall_score: data.overall_score ?? null,
        overall_label: data.overall_label ?? null,
        resolution_score: args.includeResolution ? data.resolution_score ?? null : null,
        resolution_label: args.includeResolution ? data.resolution_label ?? null : null,
        suggestion: data.suggestion ?? null,
        criticism: data.criticism ?? null,
        graded_content: args.content,
      });
    } catch (err) {
      console.error("[useGrading] gradeTurn failed:", err);
    } finally {
      // Keep key in set — never re-grade the same turn even on error to avoid loops.
    }
  }, []);

  const gradeFinal = useCallback(async (args: GradeFinalArgs) => {
    const key = args.participantId;
    if (inflightFinalRef.current.has(key)) return;
    inflightFinalRef.current.add(key);

    try {
      // Skip if speaker said nothing.
      if (!args.allTurns.length || args.allTurns.every((t) => !t.content?.trim())) return;

      // Check if a final grade already exists (idempotency across reloads).
      const { data: existing } = await supabase
        .from("debate_grades" as any)
        .select("id")
        .eq("debate_id", args.debateId)
        .eq("participant_id", args.participantId)
        .eq("grade_kind", "final")
        .maybeSingle();
      if (existing) return;

      const { data, error } = await supabase.functions.invoke("ai-facilitator", {
        body: {
          action: "grade_final",
          payload: {
            topic: args.topic,
            side: args.side,
            allTurns: args.allTurns,
            opposingTurns: args.opposingTurns,
            includeResolution: args.includeResolution,
          },
        },
      });
      if (error) throw error;
      if (!data) return;

      await supabase.from("debate_grades" as any).insert({
        debate_id: args.debateId,
        participant_id: args.participantId,
        user_id: args.userId,
        subtopic_id: null,
        turn_index: null,
        grade_kind: "final",
        argument_quality: data.argument_quality ?? null,
        opposition_engagement: data.opposition_engagement ?? null,
        clarity_structure: data.clarity_structure ?? null,
        stakes_articulation: data.stakes_articulation ?? null,
        overall_score: data.overall_score ?? null,
        overall_label: data.overall_label ?? null,
        resolution_score: args.includeResolution ? data.resolution_score ?? null : null,
        resolution_label: args.includeResolution ? data.resolution_label ?? null : null,
        narrative: data.narrative ?? null,
        graded_content: args.allTurns.map((t) => `[${t.subtopic}] ${t.content}`).join("\n\n"),
      });
    } catch (err) {
      console.error("[useGrading] gradeFinal failed:", err);
    }
  }, []);

  return { gradeTurn, gradeFinal };
}
