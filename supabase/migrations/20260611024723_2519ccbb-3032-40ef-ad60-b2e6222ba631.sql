CREATE OR REPLACE FUNCTION public.promote_lobby_to_participants(_debate_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count int := 0;
  v_topic text;
  v_format text;
BEGIN
  SELECT topic, COALESCE(format, 'standard')
    INTO v_topic, v_format
  FROM public.debates
  WHERE id = _debate_id AND created_by = auth.uid();

  IF v_topic IS NULL THEN
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
  ),
  notify AS (
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      debate_id,
      type,
      title,
      body,
      metadata
    )
    SELECT
      s.user_id,
      auth.uid(),
      _debate_id,
      'session_started',
      'Debate is live',
      v_topic,
      jsonb_build_object(
        'action', 'enter',
        'route', '/debate/' || _debate_id::text,
        'session_kind', CASE WHEN v_format = 'change_my_mind' THEN 'cmm' ELSE 'debate' END,
        'debate_topic', v_topic
      )
    FROM src s
    WHERE s.user_id <> auth.uid()
    RETURNING 1
  )
  SELECT count(*) INTO inserted_count FROM ins;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_lobby_to_participants(uuid) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;