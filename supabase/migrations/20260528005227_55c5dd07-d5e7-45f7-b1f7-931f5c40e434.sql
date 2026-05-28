
ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS active_host_user_id uuid,
  ADD COLUMN IF NOT EXISTS active_host_heartbeat_at timestamptz;

-- Default the active host to the creator on first read; backfill existing rows.
UPDATE public.debates
  SET active_host_user_id = created_by
  WHERE active_host_user_id IS NULL;

CREATE OR REPLACE FUNCTION public.debate_host_heartbeat(_debate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.debates
    SET active_host_heartbeat_at = now(),
        active_host_user_id = COALESCE(active_host_user_id, _me)
    WHERE id = _debate_id
      AND (active_host_user_id = _me OR active_host_user_id IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_debate_host(_debate_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _current uuid;
  _hb timestamptz;
  _creator uuid;
  _facilitator uuid;
  _is_participant boolean;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT active_host_user_id, active_host_heartbeat_at, created_by, facilitator_user_id
    INTO _current, _hb, _creator, _facilitator
    FROM public.debates WHERE id = _debate_id;

  -- Creator and facilitator can always reclaim.
  IF _me = _creator OR _me = _facilitator THEN
    UPDATE public.debates
      SET active_host_user_id = _me,
          active_host_heartbeat_at = now()
      WHERE id = _debate_id;
    RETURN true;
  END IF;

  -- Otherwise must be a participant AND the current host must be stale.
  SELECT EXISTS (
    SELECT 1 FROM public.debate_participants
      WHERE debate_id = _debate_id AND user_id = _me
  ) INTO _is_participant;

  IF NOT _is_participant THEN RETURN false; END IF;

  IF _hb IS NULL OR _hb < now() - interval '60 seconds' THEN
    UPDATE public.debates
      SET active_host_user_id = _me,
          active_host_heartbeat_at = now()
      WHERE id = _debate_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debate_host_heartbeat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_debate_host(uuid) TO authenticated;
