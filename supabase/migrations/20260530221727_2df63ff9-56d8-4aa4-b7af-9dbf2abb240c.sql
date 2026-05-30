-- Ensure `debates` table is in the realtime publication so lobby pages
-- get instant UPDATE notifications when the host flips status to 'live'.
-- Wrapped in DO blocks so reruns are no-ops if already configured.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'debates'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.debates';
  END IF;
END $$;

ALTER TABLE public.debates REPLICA IDENTITY FULL;