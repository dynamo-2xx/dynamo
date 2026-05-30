
-- Pause snapshot model: store remaining seconds at pause time so resume
-- continues from the exact value instead of any time-shift drift.
ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS pause_remaining_seconds int;

-- Helper to parse stored time_per_turn ("2 min", "30s", etc.) to seconds.
CREATE OR REPLACE FUNCTION public._parse_time_to_seconds(t text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN t IS NULL THEN 120
    WHEN position('min' in t) > 0 THEN
      COALESCE(NULLIF(regexp_replace(t, '\D.*$', ''), '')::int, 2) * 60
    WHEN position('s' in t) > 0 THEN
      COALESCE(NULLIF(regexp_replace(t, '\D.*$', ''), '')::int, 30)
    ELSE 120
  END;
$$;

-- Atomic speaker resume using snapshot model: rebuilds turn_started_at from
-- the remaining seconds captured at pause time. No "shift forward" math.
CREATE OR REPLACE FUNCTION public.resume_speaker_pause(_debate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_s int;
  rem_s  int;
BEGIN
  SELECT public._parse_time_to_seconds(time_per_turn),
         COALESCE(pause_remaining_seconds, 0)
    INTO full_s, rem_s
  FROM public.debates
  WHERE id = _debate_id;

  IF full_s IS NULL THEN RETURN; END IF;

  UPDATE public.debates
     SET speaker_paused_at = NULL,
         speaker_pause_owner_id = NULL,
         pause_remaining_seconds = NULL,
         turn_started_at = now() - make_interval(secs => GREATEST(0, full_s - rem_s))
   WHERE id = _debate_id
     AND speaker_paused_at IS NOT NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resume_speaker_pause(uuid) TO authenticated;

-- Speaker pause: snapshot remaining seconds. Active speaker only — checked
-- by client (canControl gate) plus a soft check here that the user is a
-- participant on the debate.
CREATE OR REPLACE FUNCTION public.pause_speaker_pause(
  _debate_id uuid,
  _remaining_seconds int,
  _turn_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.debate_participants
     WHERE debate_id = _debate_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.debates
     WHERE id = _debate_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  UPDATE public.debates
     SET speaker_paused_at = now(),
         speaker_pause_owner_id = auth.uid(),
         speaker_pause_used_turn_key = _turn_key,
         pause_remaining_seconds = GREATEST(0, _remaining_seconds)
   WHERE id = _debate_id
     AND speaker_paused_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.pause_speaker_pause(uuid, int, text) TO authenticated;

-- Host facilitator pause + resume (snapshot model). Host == created_by.
CREATE OR REPLACE FUNCTION public.pause_debate(
  _debate_id uuid,
  _remaining_seconds int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.debates
     WHERE id = _debate_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not the host';
  END IF;

  UPDATE public.debates
     SET paused_at = now(),
         pause_remaining_seconds = GREATEST(0, _remaining_seconds)
   WHERE id = _debate_id
     AND paused_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.pause_debate(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.resume_debate(_debate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_s int;
  rem_s  int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.debates
     WHERE id = _debate_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not the host';
  END IF;

  SELECT public._parse_time_to_seconds(time_per_turn),
         COALESCE(pause_remaining_seconds, 0)
    INTO full_s, rem_s
  FROM public.debates
  WHERE id = _debate_id;

  UPDATE public.debates
     SET paused_at = NULL,
         pause_remaining_seconds = NULL,
         turn_started_at = now() - make_interval(secs => GREATEST(0, full_s - rem_s))
   WHERE id = _debate_id
     AND paused_at IS NOT NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resume_debate(uuid) TO authenticated;

-- Promote all queued/accepted speakers into debate_participants on host start.
-- Needed because the participants INSERT RLS only allows the user themselves
-- to insert their row — so the host's prior client-side upsert was silently
-- dropped for every other speaker, leaving them stranded in the lobby.
CREATE OR REPLACE FUNCTION public.promote_lobby_to_participants(_debate_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.debates
     WHERE id = _debate_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not the host';
  END IF;

  WITH src AS (
    SELECT user_id, side_id FROM public.debate_interests
     WHERE debate_id = _debate_id AND role = 'queued_speaker' AND user_id IS NOT NULL AND side_id IS NOT NULL
    UNION
    SELECT invited_user_id AS user_id, side_id FROM public.debate_invitations
     WHERE debate_id = _debate_id AND status = 'accepted' AND invited_user_id IS NOT NULL AND side_id IS NOT NULL
  ),
  ins AS (
    INSERT INTO public.debate_participants (debate_id, user_id, side_id, participant_role)
    SELECT _debate_id, s.user_id, s.side_id, 'speaker'
    FROM src s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.debate_participants p
       WHERE p.debate_id = _debate_id AND p.user_id = s.user_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO inserted_count FROM ins;

  RETURN inserted_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.promote_lobby_to_participants(uuid) TO authenticated;
