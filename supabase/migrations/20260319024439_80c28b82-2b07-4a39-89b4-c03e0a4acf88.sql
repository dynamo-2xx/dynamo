
ALTER TABLE public.debate_invitations 
ADD COLUMN side_id uuid REFERENCES public.debate_sides(id) ON DELETE SET NULL,
ADD COLUMN invite_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
ADD COLUMN invited_email text;

-- Allow public (unauthenticated) SELECT on invitations by token for preview page
CREATE POLICY "Anyone can view invitations by token"
ON public.debate_invitations
FOR SELECT
TO anon
USING (true);
