import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AverageGrade {
  loading: boolean;
  /** Average overall_score across all final grades (0–10), or null if none. */
  average: number | null;
  /** Number of debates included in the average. */
  count: number;
}

/**
 * Loads the current user's average overall performance score across every
 * debate where a `final` grade has been recorded for them. Refetches whenever
 * the user changes; lightweight (one query, no realtime).
 */
export const useUserAverageGrade = (): AverageGrade => {
  const { user } = useAuth();
  const [state, setState] = useState<AverageGrade>({ loading: true, average: null, count: 0 });

  useEffect(() => {
    if (!user) {
      setState({ loading: false, average: null, count: 0 });
      return;
    }
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("debate_grades" as any)
        .select("overall_score, grade_kind, user_id")
        .eq("user_id", user.id)
        .eq("grade_kind", "final");

      if (!mounted) return;
      if (error || !data) {
        setState({ loading: false, average: null, count: 0 });
        return;
      }

      const scores = ((data as unknown) as Array<{ overall_score: number | null }>)
        .map((r) => r.overall_score)
        .filter((s): s is number => typeof s === "number");

      if (scores.length === 0) {
        setState({ loading: false, average: null, count: 0 });
        return;
      }
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      setState({ loading: false, average: avg, count: scores.length });
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  return state;
};
