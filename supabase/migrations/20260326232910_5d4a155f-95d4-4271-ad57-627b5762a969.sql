
ALTER TABLE public.live_sessions 
  ADD COLUMN share_token text UNIQUE DEFAULT NULL,
  ADD COLUMN speaker_names jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE POLICY "Anyone can view shared live sessions"
  ON public.live_sessions FOR SELECT TO anon
  USING (share_token IS NOT NULL);
