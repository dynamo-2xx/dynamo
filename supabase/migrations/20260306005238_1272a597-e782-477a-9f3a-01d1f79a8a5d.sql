-- Add turn tracking columns to debates
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS current_subtopic_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS current_turn integer NOT NULL DEFAULT 0;
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS current_speaker_side_id uuid REFERENCES public.debate_sides(id);

-- Round summaries table
CREATE TABLE IF NOT EXISTS public.round_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES public.debate_subtopics(id) ON DELETE CASCADE,
  summary text NOT NULL,
  key_arguments jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.round_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Round summaries visible with debate"
  ON public.round_summaries FOR SELECT
  USING (EXISTS (SELECT 1 FROM debates d WHERE d.id = round_summaries.debate_id AND (d.is_public = true OR auth.uid() = d.created_by)));

CREATE POLICY "System can insert summaries"
  ON public.round_summaries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM debates d WHERE d.id = round_summaries.debate_id AND auth.uid() = d.created_by));