DELETE FROM public.clubs WHERE name = 'rls_test_private';

DROP POLICY IF EXISTS "View public or member clubs" ON public.clubs;
CREATE POLICY "View public or member clubs"
ON public.clubs
FOR SELECT
TO anon, authenticated
USING (
  is_public = true
  OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
  OR (auth.uid() IS NOT NULL AND public.is_club_member(id))
);