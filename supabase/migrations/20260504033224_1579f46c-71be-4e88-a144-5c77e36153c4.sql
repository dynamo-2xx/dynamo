DROP FUNCTION IF EXISTS public.can_view_record(text, uuid);

CREATE OR REPLACE FUNCTION public.can_view_record(_record_type TEXT, _record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _record_type IN ('debate','change_my_mind') THEN
      EXISTS (
        SELECT 1 FROM public.debates d
        WHERE d.id = _record_id
          AND (d.is_public = true
               OR d.created_by = auth.uid()
               OR EXISTS (SELECT 1 FROM public.debate_participants dp WHERE dp.debate_id = d.id AND dp.user_id = auth.uid()))
      )
    WHEN _record_type = 'live_session' THEN
      EXISTS (
        SELECT 1 FROM public.live_sessions s
        WHERE s.id = _record_id
          AND (s.is_public = true OR s.created_by = auth.uid())
      )
    ELSE false
  END
$$;

CREATE TABLE IF NOT EXISTS public.record_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_type TEXT NOT NULL CHECK (record_type IN ('debate','live_session','change_my_mind')),
  record_id UUID NOT NULL,
  parent_id UUID NULL REFERENCES public.record_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(btrim(body)) > 0 AND length(body) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_record_comments_record ON public.record_comments(record_type, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_comments_user ON public.record_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_record_comments_parent ON public.record_comments(parent_id);

ALTER TABLE public.record_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View comments on visible records" ON public.record_comments;
CREATE POLICY "View comments on visible records"
ON public.record_comments FOR SELECT
TO anon, authenticated
USING (
  CASE
    WHEN record_type IN ('debate','change_my_mind') THEN
      EXISTS (SELECT 1 FROM public.debates d WHERE d.id = record_id AND d.is_public = true)
      OR (auth.uid() IS NOT NULL AND public.can_view_record(record_type, record_id))
    WHEN record_type = 'live_session' THEN
      EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = record_id AND s.is_public = true)
      OR (auth.uid() IS NOT NULL AND public.can_view_record(record_type, record_id))
    ELSE false
  END
);

DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.record_comments;
CREATE POLICY "Authenticated users can post comments"
ON public.record_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.can_view_record(record_type, record_id)
);

DROP POLICY IF EXISTS "Authors can update own comments" ON public.record_comments;
CREATE POLICY "Authors can update own comments"
ON public.record_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete own comments" ON public.record_comments;
CREATE POLICY "Authors can delete own comments"
ON public.record_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_record_comments_updated_at ON public.record_comments;
CREATE TRIGGER trg_record_comments_updated_at
BEFORE UPDATE ON public.record_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.record_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
ALTER TABLE public.record_comments REPLICA IDENTITY FULL;

ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS cover_image_url TEXT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('record-covers', 'record-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Record covers are publicly readable" ON storage.objects;
CREATE POLICY "Record covers are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'record-covers');

DROP POLICY IF EXISTS "Users can upload their own record covers" ON storage.objects;
CREATE POLICY "Users can upload their own record covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'record-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own record covers" ON storage.objects;
CREATE POLICY "Users can update their own record covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'record-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own record covers" ON storage.objects;
CREATE POLICY "Users can delete their own record covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'record-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);