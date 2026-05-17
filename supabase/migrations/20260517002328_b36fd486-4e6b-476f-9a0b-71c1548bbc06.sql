
-- §13: host evict for live participants
CREATE OR REPLACE FUNCTION public.evict_live_participant(_session_id uuid, _device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_live_session_host(_session_id) THEN
    RAISE EXCEPTION 'Only the host can evict participants';
  END IF;
  DELETE FROM public.live_session_participants
  WHERE session_id = _session_id AND device_id = _device_id;
END;
$$;

-- §13: bump auto-prune window from 10s to 5min
CREATE OR REPLACE FUNCTION public.purge_stale_live_participants(_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.live_session_participants
  WHERE session_id = _session_id
    AND last_seen_at < now() - interval '5 minutes';
$$;

-- §13: same bump in heartbeat function
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
    AND last_seen_at < now() - interval '5 minutes';
END;
$$;
