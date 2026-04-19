CREATE OR REPLACE FUNCTION public.join_live_session(_code text, _device_id text, _display_name text, _avatar_url text DEFAULT NULL::text)
 RETURNS TABLE(session_id uuid, speaker_slot integer, title text, mode text, host_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sid uuid;
  _title text;
  _mode text;
  _host uuid;
  _slot int;
  _existing_slot int;
  _is_host boolean;
BEGIN
  IF _code IS NULL OR length(_code) < 4 THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;

  SELECT s.id, s.title, s.mode, s.created_by
  INTO _sid, _title, _mode, _host
  FROM public.live_sessions s
  WHERE upper(s.join_code) = upper(_code)
    AND s.status = 'recording'
  LIMIT 1;

  IF _sid IS NULL THEN
    RAISE EXCEPTION 'Session not found or not active';
  END IF;

  _is_host := (auth.uid() IS NOT NULL AND auth.uid() = _host);

  -- Purge stale rows (qualify with table alias to avoid OUT param name clash)
  DELETE FROM public.live_session_participants p
  WHERE p.session_id = _sid
    AND p.device_id <> _device_id
    AND p.last_seen_at < now() - interval '60 seconds';

  IF _is_host THEN
    DELETE FROM public.live_session_participants p
    WHERE p.session_id = _sid
      AND p.speaker_slot = 1
      AND p.device_id <> _device_id;

    INSERT INTO public.live_session_participants AS lp
      (session_id, device_id, user_id, display_name, avatar_url, speaker_slot)
    VALUES
      (_sid, _device_id, auth.uid(), _display_name, _avatar_url, 1)
    ON CONFLICT (session_id, device_id) DO UPDATE
      SET speaker_slot = 1,
          display_name = COALESCE(EXCLUDED.display_name, lp.display_name),
          avatar_url = COALESCE(EXCLUDED.avatar_url, lp.avatar_url),
          user_id = COALESCE(EXCLUDED.user_id, lp.user_id),
          last_seen_at = now();

    RETURN QUERY SELECT _sid, 1, _title, _mode, _host;
    RETURN;
  END IF;

  SELECT p.speaker_slot INTO _existing_slot
  FROM public.live_session_participants p
  WHERE p.session_id = _sid AND p.device_id = _device_id;

  IF _existing_slot IS NOT NULL THEN
    UPDATE public.live_session_participants p
    SET display_name = COALESCE(_display_name, p.display_name),
        avatar_url = COALESCE(_avatar_url, p.avatar_url),
        user_id = COALESCE(auth.uid(), p.user_id),
        last_seen_at = now()
    WHERE p.session_id = _sid AND p.device_id = _device_id;

    RETURN QUERY SELECT _sid, _existing_slot, _title, _mode, _host;
    RETURN;
  END IF;

  SELECT COALESCE(MIN(s2.n), 2) INTO _slot
  FROM generate_series(2, 32) AS s2(n)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.live_session_participants p
    WHERE p.session_id = _sid AND p.speaker_slot = s2.n
  );

  INSERT INTO public.live_session_participants
    (session_id, device_id, user_id, display_name, avatar_url, speaker_slot)
  VALUES
    (_sid, _device_id, auth.uid(), _display_name, _avatar_url, _slot);

  RETURN QUERY SELECT _sid, _slot, _title, _mode, _host;
END;
$function$;