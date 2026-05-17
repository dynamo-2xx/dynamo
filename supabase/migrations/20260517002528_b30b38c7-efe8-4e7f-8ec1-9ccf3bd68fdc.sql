
-- ============== §14: locale on profiles ==============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en-US';

-- ============== §5: 48h deletion grace for debates ==============
-- Add new status value
ALTER TYPE public.debate_status ADD VALUE IF NOT EXISTS 'pending_deletion';

ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;

-- ============== §5: soft delete on club tables ==============
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='club_events') THEN
    EXECUTE 'ALTER TABLE public.club_events
             ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
             ADD COLUMN IF NOT EXISTS deleted_by uuid';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='club_members') THEN
    EXECUTE 'ALTER TABLE public.club_members
             ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
             ADD COLUMN IF NOT EXISTS deleted_by uuid';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='club_tags') THEN
    EXECUTE 'ALTER TABLE public.club_tags
             ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
             ADD COLUMN IF NOT EXISTS deleted_by uuid';
  END IF;
END $$;

-- ============== §5: debate access requests ==============
CREATE TABLE IF NOT EXISTS public.debate_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  UNIQUE (debate_id, requester_id)
);

ALTER TABLE public.debate_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters see their own requests"
  ON public.debate_access_requests FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Debate creators see requests for their debates"
  ON public.debate_access_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid()));

CREATE POLICY "Users create their own access requests"
  ON public.debate_access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Debate creators decide requests"
  ON public.debate_access_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid()));

-- ============== §5: club audit log ==============
CREATE TABLE IF NOT EXISTS public.club_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_kind text,
  target_id uuid,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_audit_log_club ON public.club_audit_log(club_id, created_at DESC);

ALTER TABLE public.club_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club owners read audit log"
  ON public.club_audit_log FOR SELECT
  USING (public.is_club_owner(club_id));

CREATE POLICY "Club admins write audit log"
  ON public.club_audit_log FOR INSERT
  WITH CHECK (public.is_club_admin(club_id) AND actor_id = auth.uid());

-- ============== §5: can_preview_debate helper ==============
CREATE OR REPLACE FUNCTION public.can_preview_debate(_debate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.debates d WHERE d.id = _debate_id);
$$;
