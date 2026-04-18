CREATE POLICY "Admins can create any tag"
ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));