-- 1) Cap on in-person speakers per side
ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS max_speakers_per_side INT NOT NULL DEFAULT 2;

-- 2) Secure RPC for in-person joiners
CREATE OR REPLACE FUNCTION public.join_debate_in_person(_code text, _side_id uuid)
RETURNS TABLE(debate_id uuid, side_id uuid, became_audience boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _debate public.debates%ROWTYPE;
  _side public.debate_sides%ROWTYPE;
  _current_speakers int;
  _cap int;
  _role text := 'speaker';
  _final_side uuid;
  _became_audience boolean := false;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _code IS NULL OR length(_code) < 4 THEN
    RAISE EXCEPTION 'Invalid join code';
  END IF;

  SELECT * INTO _debate
  FROM public.debates
  WHERE upper(join_code) = upper(_code)
  LIMIT 1;

  IF _debate.id IS NULL THEN
    RAISE EXCEPTION 'Debate not found for that code';
  END IF;

  -- Validate the side belongs to this debate (if a side was provided)
  IF _side_id IS NOT NULL THEN
    SELECT * INTO _side FROM public.debate_sides
    WHERE id = _side_id AND debate_id = _debate.id;
    IF _side.id IS NULL THEN
      RAISE EXCEPTION 'Side does not belong to this debate';
    END IF;
  END IF;

  _cap := COALESCE(_debate.max_speakers_per_side, 2);

  -- If a side was requested, enforce cap; otherwise this becomes audience
  IF _side_id IS NOT NULL THEN
    SELECT count(*) INTO _current_speakers
    FROM public.debate_participants
    WHERE debate_participants.debate_id = _debate.id
      AND debate_participants.side_id = _side_id
      AND debate_participants.participant_role = 'speaker';

    IF _current_speakers >= _cap THEN
      _role := 'audience';
      _final_side := NULL;
      _became_audience := true;
    ELSE
      _final_side := _side_id;
    END IF;
  ELSE
    _role := 'audience';
    _final_side := NULL;
    _became_audience := true;
  END IF;

  -- Upsert participant row
  IF EXISTS (
    SELECT 1 FROM public.debate_participants
    WHERE debate_participants.debate_id = _debate.id AND user_id = _me
  ) THEN
    UPDATE public.debate_participants
    SET side_id = _final_side,
        participant_role = _role
    WHERE debate_participants.debate_id = _debate.id AND user_id = _me;
  ELSE
    INSERT INTO public.debate_participants (debate_id, user_id, side_id, participant_role)
    VALUES (_debate.id, _me, _final_side, _role);
  END IF;

  -- Record an accepted invitation so they appear in the creator's invited list
  IF NOT EXISTS (
    SELECT 1 FROM public.debate_invitations
    WHERE debate_invitations.debate_id = _debate.id AND invited_user_id = _me
  ) THEN
    INSERT INTO public.debate_invitations (
      debate_id, invited_user_id, invited_username, side_id, status
    )
    VALUES (
      _debate.id,
      _me,
      COALESCE((SELECT display_name FROM public.profiles WHERE user_id = _me), 'Joiner'),
      _final_side,
      'accepted'
    );
  ELSE
    UPDATE public.debate_invitations
    SET side_id = _final_side, status = 'accepted'
    WHERE debate_invitations.debate_id = _debate.id AND invited_user_id = _me;
  END IF;

  RETURN QUERY SELECT _debate.id, _final_side, _became_audience;
END;
$$;