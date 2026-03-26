
CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  mode text NOT NULL DEFAULT 'single_device',
  status text NOT NULL DEFAULT 'recording',
  transcript_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  summaries jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtopics jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own live sessions"
  ON public.live_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create live sessions"
  ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own live sessions"
  ON public.live_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own live sessions"
  ON public.live_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
