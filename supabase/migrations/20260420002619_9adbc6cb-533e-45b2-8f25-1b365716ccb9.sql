CREATE OR REPLACE FUNCTION public.purge_stale_live_participants(_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.live_session_participants
  WHERE session_id = _session_id
    AND last_seen_at < now() - interval '10 seconds';
$$;

CREATE OR REPLACE FUNCTION public.live_session_heartbeat(_session_id uuid, _device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.live_session_participants
  SET last_seen_at = now()
  WHERE session_id = _session_id AND device_id = _device_id;

  DELETE FROM public.live_session_participants
  WHERE session_id = _session_id
    AND device_id <> _device_id
    AND last_seen_at < now() - interval '10 seconds';
END;
$$;