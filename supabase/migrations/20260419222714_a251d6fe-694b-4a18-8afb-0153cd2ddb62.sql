
-- 1) Add join_code to live_sessions (auto-generated, unique)
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS join_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_live_session_join_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_sessions_join_code ON public.live_sessions;
CREATE TRIGGER trg_live_sessions_join_code
BEFORE INSERT ON public.live_sessions
FOR EACH ROW EXECUTE FUNCTION public.generate_live_session_join_code();

-- Backfill existing sessions
UPDATE public.live_sessions
SET join_code = upper(substring(md5(random()::text || id::text) from 1 for 6))
WHERE join_code IS NULL;

-- 2) live_session_participants
CREATE TABLE IF NOT EXISTS public.live_session_participants (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  user_id uuid NULL,
  display_name text NOT NULL,
  avatar_url text NULL,
  speaker_slot int NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, device_id),
  UNIQUE (session_id, speaker_slot)
);

ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;

-- 3) live_session_entries
CREATE TABLE IF NOT EXISTS public.live_session_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  user_id uuid NULL,
  speaker_slot int NOT NULL,
  speaker_name text NOT NULL,
  text text NOT NULL,
  words jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_ts timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lse_session_clientts ON public.live_session_entries(session_id, client_ts);

ALTER TABLE public.live_session_entries ENABLE ROW LEVEL SECURITY;

-- 4) Helper functions
CREATE OR REPLACE FUNCTION public.can_view_live_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = _session_id
      AND (
        s.is_public = true
        OR s.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.live_session_participants p
          WHERE p.session_id = s.id AND p.user_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_live_session_host(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = _session_id AND s.created_by = auth.uid()
  );
$$;

-- 5) RLS policies for participants
DROP POLICY IF EXISTS "View participants of accessible sessions" ON public.live_session_participants;
CREATE POLICY "View participants of accessible sessions"
ON public.live_session_participants
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_session_participants.session_id
      AND (s.is_public = true OR s.created_by = auth.uid())
  )
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Host can update/delete participants" ON public.live_session_participants;
CREATE POLICY "Host can update participants"
ON public.live_session_participants
FOR UPDATE
TO authenticated
USING (public.is_live_session_host(session_id))
WITH CHECK (public.is_live_session_host(session_id));

CREATE POLICY "Host can delete participants"
ON public.live_session_participants
FOR DELETE
TO authenticated
USING (public.is_live_session_host(session_id));

CREATE POLICY "User can update own device row"
ON public.live_session_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Note: INSERT into participants is done exclusively via join_live_session() RPC (SECURITY DEFINER). No direct INSERT policy.

-- 6) RLS policies for entries
DROP POLICY IF EXISTS "View entries of accessible sessions" ON public.live_session_entries;
CREATE POLICY "View entries of accessible sessions"
ON public.live_session_entries
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_session_entries.session_id
      AND (s.is_public = true OR s.created_by = auth.uid())
  )
  OR (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.live_session_participants p
      WHERE p.session_id = live_session_entries.session_id AND p.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Host or participant can insert entries" ON public.live_session_entries;
CREATE POLICY "Host or participant can insert entries"
ON public.live_session_entries
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_live_session_host(session_id)
  OR EXISTS (
    SELECT 1 FROM public.live_session_participants p
    WHERE p.session_id = live_session_entries.session_id
      AND p.user_id = auth.uid()
  )
);

-- 7) join_live_session RPC
CREATE OR REPLACE FUNCTION public.join_live_session(
  _code text,
  _device_id text,
  _display_name text,
  _avatar_url text DEFAULT NULL
)
RETURNS TABLE(session_id uuid, speaker_slot int, title text, mode text, host_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sid uuid;
  _title text;
  _mode text;
  _host uuid;
  _slot int;
  _existing_slot int;
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

  -- If this device already joined, return its slot
  SELECT p.speaker_slot INTO _existing_slot
  FROM public.live_session_participants p
  WHERE p.session_id = _sid AND p.device_id = _device_id;

  IF _existing_slot IS NOT NULL THEN
    UPDATE public.live_session_participants
    SET display_name = COALESCE(_display_name, display_name),
        avatar_url = COALESCE(_avatar_url, avatar_url),
        user_id = COALESCE(auth.uid(), user_id),
        last_seen_at = now()
    WHERE session_id = _sid AND device_id = _device_id;

    RETURN QUERY SELECT _sid, _existing_slot, _title, _mode, _host;
    RETURN;
  END IF;

  -- Find next free slot starting at 1 (slot 1 = host)
  SELECT COALESCE(MIN(s2.n), 1) INTO _slot
  FROM generate_series(1, 32) AS s2(n)
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
$$;

-- 8) heartbeat RPC
CREATE OR REPLACE FUNCTION public.live_session_heartbeat(_session_id uuid, _device_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.live_session_participants
  SET last_seen_at = now()
  WHERE session_id = _session_id AND device_id = _device_id;
$$;

-- 9) Realtime
ALTER TABLE public.live_session_participants REPLICA IDENTITY FULL;
ALTER TABLE public.live_session_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_entries;
