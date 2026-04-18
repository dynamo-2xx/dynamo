DROP POLICY IF EXISTS "Users can view their own live sessions" ON public.live_sessions;

CREATE POLICY "Users can view own or public live sessions"
ON public.live_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = created_by OR is_public = true);