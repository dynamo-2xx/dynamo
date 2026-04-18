
-- 1. INVITATIONS
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.debate_invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (id uuid, debate_id uuid, invited_username text, invited_email text, side_id uuid, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, debate_id, invited_username, invited_email, side_id, status, created_at
  FROM public.debate_invitations WHERE invite_token = _token LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- 2. TRANSCRIPTS
DROP POLICY IF EXISTS "Anyone can view transcripts" ON public.debate_transcripts;
DROP POLICY IF EXISTS "Participants and creator can view transcripts" ON public.debate_transcripts;
CREATE POLICY "Participants and creator can view transcripts"
ON public.debate_transcripts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.debate_participants dp WHERE dp.debate_id = debate_transcripts.debate_id AND dp.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_transcripts.debate_id AND d.created_by = auth.uid())
);

-- 3. LIVE SESSIONS
DROP POLICY IF EXISTS "Anyone can view shared live sessions" ON public.live_sessions;

CREATE OR REPLACE FUNCTION public.get_shared_live_session(_token text)
RETURNS TABLE (id uuid, title text, status text, mode text, transcript_entries jsonb, summaries jsonb, subtopics jsonb, speaker_names jsonb, created_at timestamptz, ended_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, status, mode, transcript_entries, summaries, subtopics, speaker_names, created_at, ended_at
  FROM public.live_sessions WHERE share_token = _token AND share_token IS NOT NULL LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_live_session(text) TO anon, authenticated;

-- 4. PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Public profiles viewable by everyone"
ON public.profiles FOR SELECT TO anon, authenticated
USING (is_public = true);

CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, banner_url text, affiliation text, role app_role, is_public boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, display_name, avatar_url, banner_url, affiliation, role, is_public, created_at
  FROM public.profiles WHERE user_id = _user_id AND is_public = true LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;

-- 5. STORAGE: drop ALL existing avatar/banner policies, then recreate cleanly
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated can read avatars and banners"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('avatars', 'banners'));

CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'banners')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('avatars', 'banners')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('avatars', 'banners')
  AND auth.uid()::text = (storage.foldername(name))[1]
);
