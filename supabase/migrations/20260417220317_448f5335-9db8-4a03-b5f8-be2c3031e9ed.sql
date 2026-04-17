-- 1. Add feedback flag to debates
ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS feedback_enabled boolean NOT NULL DEFAULT false;

-- 2. Create debate_grades table
CREATE TABLE IF NOT EXISTS public.debate_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  subtopic_id uuid,
  turn_index integer,
  grade_kind text NOT NULL DEFAULT 'turn', -- 'turn' | 'final'
  argument_quality numeric(3,1),
  opposition_engagement numeric(3,1),
  clarity_structure numeric(3,1),
  stakes_articulation numeric(3,1),
  overall_score numeric(3,1),
  overall_label text,
  resolution_score numeric(3,1),
  resolution_label text,
  suggestion text,
  criticism text,
  narrative text,
  graded_content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT debate_grades_kind_check CHECK (grade_kind IN ('turn','final'))
);

CREATE INDEX IF NOT EXISTS idx_debate_grades_debate ON public.debate_grades(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_grades_user ON public.debate_grades(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_grades_participant ON public.debate_grades(participant_id);

-- 3. RLS
ALTER TABLE public.debate_grades ENABLE ROW LEVEL SECURITY;

-- Participants can view only their own grades; debate creators can view all grades for their debates
CREATE POLICY "Users view own grades or creator views all"
  ON public.debate_grades
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.debates d
      WHERE d.id = debate_grades.debate_id AND d.created_by = auth.uid()
    )
  );

-- Authenticated participants/creators can insert grades for debates they're part of
CREATE POLICY "Participants or creator can insert grades"
  ON public.debate_grades
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.debate_participants dp
      WHERE dp.debate_id = debate_grades.debate_id AND dp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.debates d
      WHERE d.id = debate_grades.debate_id AND d.created_by = auth.uid()
    )
  );

-- (No UPDATE / DELETE policies — grades are immutable.)
