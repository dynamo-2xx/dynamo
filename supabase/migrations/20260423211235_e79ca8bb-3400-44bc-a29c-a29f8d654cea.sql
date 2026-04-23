-- Helper: does the current user follow _owner?
CREATE OR REPLACE FUNCTION public.is_follower_of(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND _owner IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.connections c
       WHERE c.follower_id = auth.uid() AND c.followed_id = _owner
     );
$$;

-- Extend debate visibility: public OR creator OR participant OR follower-of-creator
CREATE OR REPLACE FUNCTION public.can_view_debate(_debate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = _debate_id
      AND (
        d.is_public = true
        OR d.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.debate_participants dp
          WHERE dp.debate_id = d.id AND dp.user_id = auth.uid()
        )
        OR public.is_follower_of(d.created_by)
      )
  );
$$;

-- Extend live session visibility similarly
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
        OR public.is_follower_of(s.created_by)
      )
  );
$$;

-- Replace direct SELECT policy on debates so followers see private debates
DROP POLICY IF EXISTS "Users view debates they have access to" ON public.debates;
CREATE POLICY "Users view debates they have access to"
ON public.debates
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.debate_participants dp
    WHERE dp.debate_id = debates.id AND dp.user_id = auth.uid()
  )
  OR public.is_follower_of(created_by)
);

-- Replace SELECT policy on live_sessions so followers see private sessions
DROP POLICY IF EXISTS "Users can view own or public live sessions" ON public.live_sessions;
CREATE POLICY "Users can view own or public live sessions"
ON public.live_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR is_public = true
  OR public.is_follower_of(created_by)
);

-- debate_tags: extend so followers of private debate's creator can see tags
DROP POLICY IF EXISTS "Users view tags of accessible debates" ON public.debate_tags;
CREATE POLICY "Users view tags of accessible debates"
ON public.debate_tags
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = debate_tags.debate_id AND d.is_public = true
  )
  OR (auth.uid() IS NOT NULL AND public.can_view_debate(debate_id))
);

-- live_session_tags: extend the same way
DROP POLICY IF EXISTS "View live session tags scoped to session visibility" ON public.live_session_tags;
CREATE POLICY "View live session tags scoped to session visibility"
ON public.live_session_tags
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_session_tags.live_session_id
      AND (
        s.is_public = true
        OR (auth.uid() IS NOT NULL AND (s.created_by = auth.uid() OR public.is_follower_of(s.created_by)))
      )
  )
);

-- live_session_entries: extend SELECT for followers of private session creator
DROP POLICY IF EXISTS "View entries of accessible sessions" ON public.live_session_entries;
CREATE POLICY "View entries of accessible sessions"
ON public.live_session_entries
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_session_entries.session_id
      AND (
        s.is_public = true
        OR s.created_by = auth.uid()
        OR (auth.uid() IS NOT NULL AND public.is_follower_of(s.created_by))
      )
  )
  OR (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.live_session_participants p
      WHERE p.session_id = live_session_entries.session_id AND p.user_id = auth.uid()
    )
  )
);

-- live_session_participants: extend SELECT for followers
DROP POLICY IF EXISTS "View participants of accessible sessions" ON public.live_session_participants;
CREATE POLICY "View participants of accessible sessions"
ON public.live_session_participants
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_session_participants.session_id
      AND (
        s.is_public = true
        OR s.created_by = auth.uid()
        OR (auth.uid() IS NOT NULL AND public.is_follower_of(s.created_by))
      )
  )
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- profiles: private profiles should be visible to the owner's followers
DROP POLICY IF EXISTS "Public profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Public or follower-visible profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  is_public = true
  OR (auth.uid() IS NOT NULL AND public.is_follower_of(user_id))
);
