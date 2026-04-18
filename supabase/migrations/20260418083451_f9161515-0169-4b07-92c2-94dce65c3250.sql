-- Add is_public and status (with archived support) to live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- status already exists as text; archived is just another value. No schema change needed for that,
-- but ensure existing rows have a sane default.
UPDATE public.live_sessions SET is_public = false WHERE is_public IS NULL;
