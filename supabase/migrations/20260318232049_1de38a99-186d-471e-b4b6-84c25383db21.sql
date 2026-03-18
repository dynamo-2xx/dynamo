
CREATE TABLE public.debate_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL,
  invited_username text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.debate_invitations ENABLE ROW LEVEL SECURITY;

-- Creator can insert invitations
CREATE POLICY "Debate creator can insert invitations"
ON public.debate_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = debate_invitations.debate_id
    AND d.created_by = auth.uid()
  )
);

-- Invited users and creators can view invitations
CREATE POLICY "Users can view their invitations"
ON public.debate_invitations
FOR SELECT
TO authenticated
USING (
  invited_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = debate_invitations.debate_id
    AND d.created_by = auth.uid()
  )
);

-- Invited users can update their invitation status
CREATE POLICY "Invited users can update invitation status"
ON public.debate_invitations
FOR UPDATE
TO authenticated
USING (invited_user_id = auth.uid())
WITH CHECK (invited_user_id = auth.uid());
