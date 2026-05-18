import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Handshake, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GradeRow {
  id: string;
  debate_id: string;
  participant_id: string;
  user_id: string;
  subtopic_id: string | null;
  turn_index: number | null;
  grade_kind: "turn" | "final";
  argument_quality: number | null;
  opposition_engagement: number | null;
  clarity_structure: number | null;
  stakes_articulation: number | null;
  overall_score: number | null;
  overall_label: string | null;
  resolution_score: number | null;
  resolution_label: string | null;
  suggestion: string | null;
  criticism: string | null;
  narrative: string | null;
  graded_content: string | null;
  created_at: string;
}

const DIMENSIONS: Array<{ key: keyof GradeRow; label: string }> = [
  { key: "argument_quality", label: "Argument Quality" },
  { key: "opposition_engagement", label: "Opposition Engagement" },
  { key: "clarity_structure", label: "Clarity & Structure" },
  { key: "stakes_articulation", label: "Stakes Articulation" },
];

const DebateGradeReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debate, setDebate] = useState<{ topic: string; feedback_enabled: boolean } | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let mounted = true;

    (async () => {
      const { data: d } = await supabase
        .from("debates")
        .select("topic, feedback_enabled" as any)
        .eq("id", id)
        .maybeSingle();
      if (!mounted) return;
      setDebate((d as any) ?? null);

      const { data: g } = await supabase
        .from("debate_grades" as any)
        .select("*")
        .eq("debate_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (!mounted) return;
      setGrades(((g as unknown) as GradeRow[]) ?? []);
      setLoading(false);

      // If feedback was enabled but no final grade yet, show "generating" state.
      const hasFinal = ((g as unknown) as GradeRow[] | null)?.some((row) => row.grade_kind === "final");
      if ((d as any)?.feedback_enabled && !hasFinal) setGenerating(true);
    })();

    // Realtime: pick up final grade once it lands.
    const channel = supabase
      .channel(`grades-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "debate_grades", filter: `debate_id=eq.${id}` },
        (payload) => {
          const row = payload.new as GradeRow;
          if (row.user_id !== user.id) return;
          setGrades((prev) => [...prev, row]);
          if (row.grade_kind === "final") setGenerating(false);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const finalGrade = useMemo(() => grades.find((g) => g.grade_kind === "final"), [grades]);
  const turnGrades = useMemo(() => grades.filter((g) => g.grade_kind === "turn"), [grades]);

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <button
          onClick={() => navigate(`/debate/${id}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-body"
        >
          <ArrowLeft className="w-4 h-4" /> Back to debate
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground font-body mb-2">
            <Award className="w-3.5 h-3.5" /> Your Performance Report
          </div>
          <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">
            {debate?.topic ?? "Loading…"}
          </h1>
          <p className="text-sm text-muted-foreground font-body italic">
            Private to you. Dynamo grades performance, never declares a winner.
          </p>
          <Link
            to={`/intelligence/debate/${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-3 border border-border rounded-full px-3 py-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> Performance Intelligence
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground font-body text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : !debate?.feedback_enabled ? (
          <div className="bg-background border border-border rounded-lg p-8 text-center">
            <p className="text-sm font-body text-muted-foreground">
              Feedback was not enabled for this debate.
            </p>
          </div>
        ) : !finalGrade && generating ? (
          <div className="bg-background border border-border rounded-lg p-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-body text-muted-foreground">
              Dynamo is grading your performance. This usually takes a few seconds…
            </p>
          </div>
        ) : !finalGrade ? (
          <div className="bg-background border border-border rounded-lg p-8 text-center">
            <p className="text-sm font-body text-muted-foreground">
              No grade available yet. If the debate just ended, refresh in a moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall + Resolution headline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreHero
                icon={<Sparkles className="w-5 h-5" />}
                title="Overall Performance"
                score={finalGrade.overall_score}
                label={finalGrade.overall_label}
              />
              {finalGrade.resolution_score !== null && (
                <ScoreHero
                  icon={<Handshake className="w-5 h-5" />}
                  title="Resolution Engagement"
                  score={finalGrade.resolution_score}
                  label={finalGrade.resolution_label}
                  variant="muted"
                />
              )}
            </div>

            {/* Dimensions */}
            <div className="bg-background border border-border rounded-lg p-5">
              <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-body mb-4">
                Dimension Scores
              </h2>
              <div className="space-y-3">
                {DIMENSIONS.map((d) => {
                  const v = (finalGrade as any)[d.key] as number | null;
                  return (
                    <div key={d.key as string} className="flex items-center gap-4">
                      <span className="text-sm font-body text-foreground flex-1">{d.label}</span>
                      <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground rounded-full"
                          style={{ width: `${Math.max(0, Math.min(100, ((v ?? 0) / 10) * 100))}%` }}
                        />
                      </div>
                      <span className="text-sm font-display text-foreground w-10 text-right tabular-nums">
                        {v !== null ? v.toFixed(1) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Narrative */}
            {finalGrade.narrative && (
              <div className="bg-background border border-border rounded-lg p-5">
                <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-body mb-3">
                  Narrative Summary
                </h2>
                <p className="text-sm font-body text-foreground leading-relaxed whitespace-pre-line">
                  {finalGrade.narrative}
                </p>
              </div>
            )}

            {/* Per-turn breakdown */}
            {turnGrades.length > 0 && (
              <div className="bg-background border border-border rounded-lg p-5">
                <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-body mb-3">
                  Turn-by-turn Notes
                </h2>
                <div className="space-y-3">
                  {turnGrades.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-l-2 border-border pl-3"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-body">
                          Turn {(t.turn_index ?? 0) + 1}
                        </span>
                        <span className="text-xs font-display text-foreground tabular-nums">
                          {t.overall_score !== null ? t.overall_score.toFixed(1) : "—"} · {t.overall_label ?? ""}
                        </span>
                      </div>
                      {t.suggestion && (
                        <p className="text-xs font-body text-foreground">
                          <span className="text-muted-foreground">Suggestion: </span>
                          {t.suggestion}
                        </p>
                      )}
                      {t.criticism && (
                        <p className="text-xs font-body text-foreground mt-0.5">
                          <span className="text-muted-foreground">Watch out: </span>
                          {t.criticism}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

interface ScoreHeroProps {
  icon: React.ReactNode;
  title: string;
  score: number | null;
  label: string | null;
  variant?: "default" | "muted";
}
const ScoreHero = ({ icon, title, score, label, variant = "default" }: ScoreHeroProps) => (
  <div
    className={`rounded-lg p-5 border ${
      variant === "muted" ? "bg-accent border-border" : "bg-foreground text-background border-foreground"
    }`}
  >
    <div className={`flex items-center gap-2 text-[11px] uppercase tracking-widest font-body mb-3 ${
      variant === "muted" ? "text-muted-foreground" : "text-background/70"
    }`}>
      {icon}
      {title}
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-5xl font-display tabular-nums">
        {score !== null ? score.toFixed(1) : "—"}
      </span>
      <span className={`text-sm font-body ${variant === "muted" ? "text-muted-foreground" : "text-background/70"}`}>
        / 10
      </span>
    </div>
    {label && (
      <p className={`text-sm font-body mt-1 ${variant === "muted" ? "text-foreground" : "text-background"}`}>
        {label}
      </p>
    )}
  </div>
);

export default DebateGradeReportPage;
