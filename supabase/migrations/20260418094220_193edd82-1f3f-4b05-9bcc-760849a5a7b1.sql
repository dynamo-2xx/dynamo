-- 1) Split debate UPDATE policy: participants can only touch prep flags; creator unrestricted
DROP POLICY IF EXISTS "Creator or participant can update debates" ON public.debates;

CREATE POLICY "Creator can update debates"
ON public.debates
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Helper to ensure participants only mutate prep readiness flags (and nothing sensitive).
CREATE OR REPLACE FUNCTION public.enforce_participant_debate_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the caller is the creator, allow anything.
  IF auth.uid() = OLD.created_by THEN
    RETURN NEW;
  END IF;

  -- Otherwise (participant path), only prep_side1_ready / prep_side2_ready may change.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.topic IS DISTINCT FROM OLD.topic
     OR NEW.is_public IS DISTINCT FROM OLD.is_public
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.facilitator_user_id IS DISTINCT FROM OLD.facilitator_user_id
     OR NEW.facilitator_type IS DISTINCT FROM OLD.facilitator_type
     OR NEW.join_code IS DISTINCT FROM OLD.join_code
     OR NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url
     OR NEW.feedback_enabled IS DISTINCT FROM OLD.feedback_enabled
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.topic_category IS DISTINCT FROM OLD.topic_category
     OR NEW.institution_tag IS DISTINCT FROM OLD.institution_tag
     OR NEW.community_tag IS DISTINCT FROM OLD.community_tag
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.ended_at IS DISTINCT FROM OLD.ended_at
     OR NEW.edit_window_ends_at IS DISTINCT FROM OLD.edit_window_ends_at
     OR NEW.current_speaker_side_id IS DISTINCT FROM OLD.current_speaker_side_id
     OR NEW.current_subtopic_index IS DISTINCT FROM OLD.current_subtopic_index
     OR NEW.current_turn IS DISTINCT FROM OLD.current_turn
     OR NEW.turn_started_at IS DISTINCT FROM OLD.turn_started_at
     OR NEW.prep_phase_active IS DISTINCT FROM OLD.prep_phase_active
     OR NEW.prep_phase_started_at IS DISTINCT FROM OLD.prep_phase_started_at
     OR NEW.prep_duration_seconds IS DISTINCT FROM OLD.prep_duration_seconds
     OR NEW.prep_time_min IS DISTINCT FROM OLD.prep_time_min
     OR NEW.prep_time_max IS DISTINCT FROM OLD.prep_time_max
     OR NEW.time_per_turn IS DISTINCT FROM OLD.time_per_turn
     OR NEW.turns_per_subtopic IS DISTINCT FROM OLD.turns_per_subtopic
  THEN
    RAISE EXCEPTION 'Participants may only update prep readiness flags';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_participant_debate_update_trg ON public.debates;
CREATE TRIGGER enforce_participant_debate_update_trg
BEFORE UPDATE ON public.debates
FOR EACH ROW EXECUTE FUNCTION public.enforce_participant_debate_update();

CREATE POLICY "Participants can update prep readiness only"
ON public.debates
FOR UPDATE
TO authenticated
USING (
  auth.uid() <> created_by
  AND EXISTS (
    SELECT 1 FROM public.debate_participants dp
    WHERE dp.debate_id = debates.id AND dp.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() <> created_by
  AND EXISTS (
    SELECT 1 FROM public.debate_participants dp
    WHERE dp.debate_id = debates.id AND dp.user_id = auth.uid()
  )
);

-- 2) Restrict debate_tags SELECT to tags on debates the caller can view
DROP POLICY IF EXISTS "Anyone can view debate tags" ON public.debate_tags;

CREATE POLICY "Users view tags of accessible debates"
ON public.debate_tags
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = debate_tags.debate_id AND d.is_public = true
  )
  OR (auth.uid() IS NOT NULL AND public.can_view_debate(debate_id))
);

-- 3) Hide invite_token from regular SELECTs.
-- The token is still readable via the SECURITY DEFINER RPC get_invitation_by_token.
DROP POLICY IF EXISTS "Users can view their invitations" ON public.debate_invitations;

CREATE OR REPLACE FUNCTION public.invitation_is_visible(_inv public.debate_invitations)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _inv.invited_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.debates d
      WHERE d.id = _inv.debate_id AND d.created_by = auth.uid()
    );
$$;

CREATE POLICY "Users can view their invitations"
ON public.debate_invitations
FOR SELECT
TO authenticated
USING (
  (invited_user_id = auth.uid()
   OR EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_invitations.debate_id AND d.created_by = auth.uid()))
);

-- Revoke direct read of invite_token; force callers through the RPC.
REVOKE SELECT (invite_token) ON public.debate_invitations FROM authenticated, anon;

-- 4) Restrict realtime.messages SELECT to debate channels the user can view.
-- Channel naming convention: topics for debate-scoped channels start with "debate:<uuid>".
DROP POLICY IF EXISTS "Allow listening to channel" ON realtime.messages;
DROP POLICY IF EXISTS "Allow pushing to channel" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can listen" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can push" ON realtime.messages;

CREATE POLICY "Authenticated users can listen to authorized channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'debate:%' THEN
      public.can_view_debate(
        (substring(realtime.topic() FROM 'debate:([0-9a-fA-F-]{36})'))::uuid
      )
    ELSE true
  END
);

CREATE POLICY "Authenticated users can push to authorized channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'debate:%' THEN
      public.can_view_debate(
        (substring(realtime.topic() FROM 'debate:([0-9a-fA-F-]{36})'))::uuid
      )
    ELSE true
  END
);
