
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_prefs jsonb NOT NULL DEFAULT '{"essential": true, "marketing": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text;

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL CHECK (reason IN ('bounce','complaint','unsubscribe','manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_all_suppressions" ON public.email_suppressions FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  amount_cents integer,
  currency text,
  fee_cents integer,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_billing_events" ON public.billing_events FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS billing_events_user_created_idx ON public.billing_events(user_id, created_at DESC);

DO $$ BEGIN
  CREATE TYPE public.perf_severity AS ENUM ('green','orange','red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.perf_pass AS ENUM ('live','deep');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.perf_group AS ENUM ('argumentative_integrity','rhetorical_effectiveness','engagement_quality','cognitive_depth');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.performance_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  session_kind text NOT NULL CHECK (session_kind IN ('debate','cmm','live')),
  participant_id uuid,
  subtopic_id uuid,
  transcript_entry_id uuid,
  char_start integer,
  char_end integer,
  attribute_group public.perf_group NOT NULL,
  sub_attribute text,
  severity public.perf_severity NOT NULL,
  pass_kind public.perf_pass NOT NULL,
  explanation text NOT NULL,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_annotations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS perf_ann_session_idx ON public.performance_annotations(session_id, session_kind);
CREATE INDEX IF NOT EXISTS perf_ann_participant_idx ON public.performance_annotations(participant_id);

CREATE POLICY "perf_ann_view" ON public.performance_annotations FOR SELECT
  USING (
    (session_kind = 'debate' AND public.can_view_debate(session_id))
    OR (participant_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "perf_ann_no_client_write" ON public.performance_annotations FOR INSERT
  WITH CHECK (false);
