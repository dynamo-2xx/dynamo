-- 1) Status + progress columns on imported_records
ALTER TABLE public.imported_records
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('processing','ready','failed')),
  ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT jsonb_build_object(
    'transcript', jsonb_build_object('state','ready'),
    'structure',  jsonb_build_object('state','ready'),
    'insights',   jsonb_build_object('state','ready')
  );

-- 2) Grants that were missing on three tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_records TO authenticated;
GRANT ALL ON public.imported_records TO service_role;

GRANT SELECT ON public.argument_units TO authenticated;
GRANT ALL ON public.argument_units TO service_role;

GRANT SELECT ON public.performance_annotations TO authenticated;
GRANT ALL ON public.performance_annotations TO service_role;

-- 3) Realtime so the progress bar can update live
ALTER PUBLICATION supabase_realtime ADD TABLE public.imported_records;
