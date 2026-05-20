CREATE TABLE IF NOT EXISTS public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  artifact text,
  bytes bigint,
  error text
);

CREATE INDEX IF NOT EXISTS idx_backup_runs_finished_at ON public.backup_runs (finished_at DESC);

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

-- Public read of recent SUCCESS rows only (powers /status page).
CREATE POLICY "status_page_can_read_recent_success"
  ON public.backup_runs FOR SELECT
  USING (status = 'success' AND finished_at > now() - interval '14 days');