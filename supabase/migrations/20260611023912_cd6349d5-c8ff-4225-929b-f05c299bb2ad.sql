ALTER TABLE public.mic_connections
  ADD COLUMN IF NOT EXISTS voice_confirmed_at timestamptz;