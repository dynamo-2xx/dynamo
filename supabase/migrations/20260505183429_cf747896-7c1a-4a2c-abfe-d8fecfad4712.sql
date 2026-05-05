-- ── mic_connections table ──────────────────────────────────────────
CREATE TABLE public.mic_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_kind text NOT NULL CHECK (session_kind IN ('debate','live','cmm')),
  session_id uuid NOT NULL,
  slot_key text NOT NULL,
  user_id uuid,
  device_id text,
  display_name text NOT NULL,
  avatar_url text,
  mode text NOT NULL DEFAULT 'own_mic' CHECK (mode IN ('own_mic','voice_detect_only')),
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','released','left')),
  last_audio_rms real NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX mic_connections_active_slot_uq
  ON public.mic_connections (session_kind, session_id, slot_key)
  WHERE status = 'connected';

CREATE INDEX mic_connections_session_idx
  ON public.mic_connections (session_kind, session_id);

CREATE INDEX mic_connections_user_idx
  ON public.mic_connections (user_id);

ALTER TABLE public.mic_connections ENABLE ROW LEVEL SECURITY;

-- ── Visibility helper ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_view_lobby(_kind text, _id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN _kind IN ('debate','cmm') THEN public.can_view_debate(_id)
    WHEN _kind = 'live' THEN public.can_view_live_session(_id)
    ELSE false
  END;
$$;

-- ── Owner-of-session helper (per-kind) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.is_session_owner(_kind text, _id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN _kind IN ('debate','cmm') THEN
      EXISTS (SELECT 1 FROM public.debates WHERE id = _id AND created_by = auth.uid())
    WHEN _kind = 'live' THEN
      EXISTS (SELECT 1 FROM public.live_sessions WHERE id = _id AND created_by = auth.uid())
    ELSE false
  END;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────
CREATE POLICY "View mic connections of accessible sessions"
ON public.mic_connections FOR SELECT
TO authenticated
USING (public.can_view_lobby(session_kind, session_id));

CREATE POLICY "Self attach to accessible session"
ON public.mic_connections FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.can_view_lobby(session_kind, session_id)
);

CREATE POLICY "Self update own row"
ON public.mic_connections FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_session_owner(session_kind, session_id))
WITH CHECK (user_id = auth.uid() OR public.is_session_owner(session_kind, session_id));

CREATE POLICY "Owner or self deletes row"
ON public.mic_connections FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_session_owner(session_kind, session_id));

-- ── Live echo guard flag ─────────────────────────────────────────────
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS echo_guard boolean NOT NULL DEFAULT false;

-- ── Realtime ─────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.mic_connections;