ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS imported_source_url text,
  ADD COLUMN IF NOT EXISTS imported_source_kind text;
CREATE INDEX IF NOT EXISTS idx_debates_imported_source_kind ON public.debates(imported_source_kind) WHERE imported_source_kind IS NOT NULL;