
ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS continued_from_id uuid REFERENCES public.debates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS continuation_index integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS continuation_root_id uuid REFERENCES public.debates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_debates_continuation_root
  ON public.debates(continuation_root_id, continuation_index);

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS continued_from_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS continuation_index integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS continuation_root_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_continuation_root
  ON public.live_sessions(continuation_root_id, continuation_index);
