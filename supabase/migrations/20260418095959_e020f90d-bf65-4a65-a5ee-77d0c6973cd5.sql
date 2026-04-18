
-- 1. debate_participants: restrict UPDATE to non-sensitive fields only.
DROP POLICY IF EXISTS "Participants can update their side" ON public.debate_participants;

CREATE OR REPLACE FUNCTION public.enforce_participant_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> OLD.user_id THEN
    RAISE EXCEPTION 'Cannot modify another user''s participant record';
  END IF;
  -- Lock down sensitive fields. Participants cannot change role, side, debate, user, or join time.
  IF NEW.participant_role IS DISTINCT FROM OLD.participant_role
     OR NEW.side_id IS DISTINCT FROM OLD.side_id
     OR NEW.debate_id IS DISTINCT FROM OLD.debate_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.joined_at IS DISTINCT FROM OLD.joined_at
  THEN
    -- Allow if caller is the debate creator (admin path).
    IF NOT EXISTS (
      SELECT 1 FROM public.debates d
      WHERE d.id = OLD.debate_id AND d.created_by = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Participants cannot change role, side, or identifying fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_participant_self_update_trg ON public.debate_participants;
CREATE TRIGGER enforce_participant_self_update_trg
BEFORE UPDATE ON public.debate_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_participant_self_update();

CREATE POLICY "Participants can update own row"
ON public.debate_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid()
))
WITH CHECK (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid()
));

-- 2. debate_participants: restrict INSERT to public debates, creator, or invited users.
DROP POLICY IF EXISTS "Users can join debates" ON public.debate_participants;

CREATE POLICY "Users can join authorized debates"
ON public.debate_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.is_public = true)
    OR EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.debate_invitations inv
      WHERE inv.debate_id = debate_participants.debate_id
        AND inv.invited_user_id = auth.uid()
    )
  )
);

-- 3. realtime.messages: drop the open `true` policies; keep only scoped access.
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime messages" ON realtime.messages;

-- Ensure scoped policies exist (idempotent recreate).
DROP POLICY IF EXISTS "Authenticated users can listen to authorized channels" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can push to authorized channels" ON realtime.messages;

CREATE POLICY "Authenticated users can listen to authorized channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.realtime_topic_debate_id((realtime.topic())::text) IS NOT NULL
      THEN public.can_view_debate(public.realtime_topic_debate_id((realtime.topic())::text))
    ELSE true
  END
);

CREATE POLICY "Authenticated users can push to authorized channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN public.realtime_topic_debate_id((realtime.topic())::text) IS NOT NULL
      THEN public.can_view_debate(public.realtime_topic_debate_id((realtime.topic())::text))
    ELSE true
  END
);

-- 4. live_session_tags: restrict to public sessions or the owner.
DROP POLICY IF EXISTS "Anyone can view live session tags" ON public.live_session_tags;

CREATE POLICY "View live session tags scoped to session visibility"
ON public.live_session_tags
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_session_tags.live_session_id
      AND (s.is_public = true OR s.created_by = auth.uid())
  )
);

-- 5. debate_invitations: ensure plaintext tokens never persist or get returned.
-- Drop the column default that auto-generates plaintext tokens.
ALTER TABLE public.debate_invitations ALTER COLUMN invite_token DROP DEFAULT;

-- Strip any existing plaintext tokens (hashes are already stored).
UPDATE public.debate_invitations SET invite_token = NULL WHERE invite_token IS NOT NULL;

-- Re-affirm trigger so any future write hashes & nulls plaintext.
DROP TRIGGER IF EXISTS hash_invite_token_trg ON public.debate_invitations;
CREATE TRIGGER hash_invite_token_trg
BEFORE INSERT OR UPDATE ON public.debate_invitations
FOR EACH ROW EXECUTE FUNCTION public.hash_invite_token();
