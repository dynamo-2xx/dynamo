
-- 1. Helper function
CREATE OR REPLACE FUNCTION public.can_view_debate(_debate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
      )
  );
$$;

-- 2. debates SELECT
DROP POLICY IF EXISTS "Authenticated users can view debates" ON public.debates;
CREATE POLICY "Users view debates they have access to"
  ON public.debates FOR SELECT TO authenticated
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.debate_participants dp
      WHERE dp.debate_id = debates.id AND dp.user_id = auth.uid()
    )
  );

-- 3. arguments SELECT
DROP POLICY IF EXISTS "Authenticated users can view arguments" ON public.arguments;
CREATE POLICY "Users view arguments in accessible debates"
  ON public.arguments FOR SELECT TO authenticated
  USING (public.can_view_debate(debate_id));

-- 4. debate_participants SELECT
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.debate_participants;
CREATE POLICY "Users view participants of accessible debates"
  ON public.debate_participants FOR SELECT TO authenticated
  USING (public.can_view_debate(debate_id));

-- 5. debate_sides SELECT
DROP POLICY IF EXISTS "Authenticated users can view sides" ON public.debate_sides;
CREATE POLICY "Users view sides of accessible debates"
  ON public.debate_sides FOR SELECT TO authenticated
  USING (public.can_view_debate(debate_id));

-- 6. debate_subtopics SELECT
DROP POLICY IF EXISTS "Authenticated users can view subtopics" ON public.debate_subtopics;
CREATE POLICY "Users view subtopics of accessible debates"
  ON public.debate_subtopics FOR SELECT TO authenticated
  USING (public.can_view_debate(debate_id));

-- 7. round_summaries SELECT
DROP POLICY IF EXISTS "Authenticated users can view round summaries" ON public.round_summaries;
CREATE POLICY "Users view summaries of accessible debates"
  ON public.round_summaries FOR SELECT TO authenticated
  USING (public.can_view_debate(debate_id));

-- 8. debate_invitations DELETE
CREATE POLICY "Creator or invitee can delete invitations"
  ON public.debate_invitations FOR DELETE TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.debates d
      WHERE d.id = debate_invitations.debate_id AND d.created_by = auth.uid()
    )
  );

-- 9. live_sessions: tighten share_token exposure
-- The existing get_shared_live_session RPC remains the public access path.
-- Keep current owner-only SELECT (already restrictive). No change needed.

-- 10. realtime.messages RLS for debate channels
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can write realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can write realtime messages"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (true);
