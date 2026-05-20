
-- Storage bucket for Import-to-Record uploads (PDF / audio / video).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imports',
  'imports',
  false,
  104857600, -- 100 MB
  ARRAY[
    'application/pdf',
    'audio/mpeg','audio/mp3','audio/mp4','audio/wav','audio/x-wav','audio/webm','audio/ogg','audio/x-m4a','audio/m4a',
    'video/mp4','video/webm','video/quicktime','video/x-m4v'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Owner-only RLS on storage.objects for this bucket.
DROP POLICY IF EXISTS "imports_owner_select" ON storage.objects;
CREATE POLICY "imports_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "imports_owner_insert" ON storage.objects;
CREATE POLICY "imports_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "imports_owner_update" ON storage.objects;
CREATE POLICY "imports_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "imports_owner_delete" ON storage.objects;
CREATE POLICY "imports_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);
