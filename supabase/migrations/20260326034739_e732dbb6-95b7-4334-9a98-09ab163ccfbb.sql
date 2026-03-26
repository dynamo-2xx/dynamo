ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS prep_time_min text NOT NULL DEFAULT '15s',
  ADD COLUMN IF NOT EXISTS prep_time_max text NOT NULL DEFAULT '60s',
  ADD COLUMN IF NOT EXISTS prep_phase_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prep_phase_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS prep_duration_seconds integer;