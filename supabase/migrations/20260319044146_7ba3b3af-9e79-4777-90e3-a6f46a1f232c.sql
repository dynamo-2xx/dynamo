
CREATE TABLE public.debate_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  transcript_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  argument_map jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(debate_id)
);

ALTER TABLE public.debate_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view transcripts" ON public.debate_transcripts
  FOR SELECT TO public USING (true);

CREATE POLICY "Participants can insert transcripts" ON public.debate_transcripts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM debate_participants dp
    WHERE dp.debate_id = debate_transcripts.debate_id AND dp.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM debates d
    WHERE d.id = debate_transcripts.debate_id AND d.created_by = auth.uid()
  ));

CREATE POLICY "Participants can update transcripts" ON public.debate_transcripts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM debate_participants dp
    WHERE dp.debate_id = debate_transcripts.debate_id AND dp.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM debates d
    WHERE d.id = debate_transcripts.debate_id AND d.created_by = auth.uid()
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_transcripts;
