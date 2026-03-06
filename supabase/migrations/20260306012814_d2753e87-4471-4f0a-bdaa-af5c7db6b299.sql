-- Allow participants to SELECT debates they're part of
CREATE POLICY "Participants can view their debates"
ON public.debates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.debate_participants dp
    WHERE dp.debate_id = debates.id AND dp.user_id = auth.uid()
  )
);

-- Allow participants to update side_id on their own participation
CREATE POLICY "Participants can update their side"
ON public.debate_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);