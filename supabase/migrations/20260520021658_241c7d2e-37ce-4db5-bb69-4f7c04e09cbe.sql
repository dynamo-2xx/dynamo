ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.club_events
  ADD COLUMN IF NOT EXISTS recurrence_rule text;

CREATE INDEX IF NOT EXISTS idx_clubs_is_featured ON public.clubs (is_featured) WHERE is_featured = true;