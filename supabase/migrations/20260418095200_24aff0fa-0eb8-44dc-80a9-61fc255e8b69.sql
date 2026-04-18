-- ============================================================
-- 1) Realtime: explicit per-prefix authorization, deny by default
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can listen to authorized channels" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can push to authorized channels" ON realtime.messages;

CREATE OR REPLACE FUNCTION public.realtime_topic_debate_id(_topic text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _topic ~ '^(debate|transcript|grades|audience|projector)-[0-9a-fA-F-]{36}$'
      THEN (regexp_replace(_topic, '^(debate|transcript|grades|audience|projector)-', ''))::uuid
    ELSE NULL
  END;
$$;

CREATE POLICY "Authenticated users can listen to authorized channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.realtime_topic_debate_id(realtime.topic()) IS NOT NULL
  AND public.can_view_debate(public.realtime_topic_debate_id(realtime.topic()))
);

CREATE POLICY "Authenticated users can push to authorized channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.realtime_topic_debate_id(realtime.topic()) IS NOT NULL
  AND public.can_view_debate(public.realtime_topic_debate_id(realtime.topic()))
);

-- ============================================================
-- 2) Invite tokens: store only a hash; plaintext returned at creation
-- ============================================================

-- Add hash column
ALTER TABLE public.debate_invitations
  ADD COLUMN IF NOT EXISTS invite_token_hash text;

-- Backfill hash from any existing plaintext tokens
UPDATE public.debate_invitations
SET invite_token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
WHERE invite_token IS NOT NULL AND invite_token_hash IS NULL;

-- Trigger: hash on insert/update if a plaintext token is present, then clear plaintext.
CREATE OR REPLACE FUNCTION public.hash_invite_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_token IS NOT NULL THEN
    NEW.invite_token_hash := encode(extensions.digest(NEW.invite_token, 'sha256'), 'hex');
    -- Clear plaintext after creation so it never persists.
    NEW.invite_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_invite_token_trg ON public.debate_invitations;
CREATE TRIGGER hash_invite_token_trg
BEFORE INSERT OR UPDATE OF invite_token ON public.debate_invitations
FOR EACH ROW EXECUTE FUNCTION public.hash_invite_token();

-- Index for fast lookup by hash
CREATE INDEX IF NOT EXISTS idx_debate_invitations_token_hash
  ON public.debate_invitations (invite_token_hash);

-- Update the lookup RPC to compare hashes
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(
  id uuid,
  debate_id uuid,
  invited_username text,
  invited_email text,
  side_id uuid,
  status text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, debate_id, invited_username, invited_email, side_id, status, created_at
  FROM public.debate_invitations
  WHERE invite_token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
  LIMIT 1;
$$;

-- Helper used by the edge function to create an invite and get back the plaintext token once.
CREATE OR REPLACE FUNCTION public.create_debate_invitation(
  _debate_id uuid,
  _invited_user_id uuid,
  _invited_username text,
  _invited_email text,
  _side_id uuid
)
RETURNS TABLE (id uuid, invite_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _is_creator boolean;
  _token text;
  _hash text;
  _new_id uuid;
BEGIN
  -- Only the debate creator may issue invitations.
  SELECT EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = _debate_id AND d.created_by = auth.uid()
  ) INTO _is_creator;

  IF NOT _is_creator THEN
    RAISE EXCEPTION 'Only the debate creator may issue invitations';
  END IF;

  _token := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  INSERT INTO public.debate_invitations (
    debate_id, invited_user_id, invited_username, invited_email, side_id, invite_token_hash
  )
  VALUES (
    _debate_id, _invited_user_id, _invited_username, _invited_email, _side_id, _hash
  )
  RETURNING public.debate_invitations.id INTO _new_id;

  RETURN QUERY SELECT _new_id, _token;
END;
$$;

-- The plaintext column is now always NULL after the trigger runs;
-- revoke direct read access on it as defense-in-depth.
REVOKE SELECT (invite_token) ON public.debate_invitations FROM authenticated, anon;
