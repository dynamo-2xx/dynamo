
-- Speaker-level pause (separate from facilitator/host pause).
-- The host pause uses `paused_at`; this is independent and is owned by the
-- current speaker so the host can never override the speaker's own controls
-- and vice-versa. We persist the "used this turn" flag so refresh/rejoin
-- doesn't grant a second pause.

ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS speaker_paused_at        timestamptz,
  ADD COLUMN IF NOT EXISTS speaker_pause_owner_id   uuid,
  ADD COLUMN IF NOT EXISTS speaker_pause_used_turn_key text;

-- Atomic resume: clears the pause and shifts turn_started_at forward by the
-- pause duration so the clock doesn't burn through paused seconds.
CREATE OR REPLACE FUNCTION public.resume_speaker_pause(_debate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paused_at_v   timestamptz;
  turn_start_v  timestamptz;
  shift_ms      bigint;
BEGIN
  SELECT speaker_paused_at, turn_started_at
    INTO paused_at_v, turn_start_v
  FROM public.debates
  WHERE id = _debate_id;

  IF paused_at_v IS NULL THEN
    RETURN;
  END IF;

  shift_ms := EXTRACT(EPOCH FROM (now() - paused_at_v)) * 1000;

  UPDATE public.debates
  SET speaker_paused_at = NULL,
      speaker_pause_owner_id = NULL,
      turn_started_at = COALESCE(turn_start_v, now()) + make_interval(secs => shift_ms / 1000.0)
  WHERE id = _debate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resume_speaker_pause(uuid) TO authenticated;
