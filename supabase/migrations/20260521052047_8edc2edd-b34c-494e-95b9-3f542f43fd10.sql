CREATE TABLE public.imported_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('url','text','pdf','media','article')),
  source_url TEXT,
  subtopics JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcript_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  argument_map JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_imported_records_user ON public.imported_records(user_id, created_at DESC);
CREATE INDEX idx_imported_records_public ON public.imported_records(is_public, created_at DESC) WHERE is_public = true;

CREATE TRIGGER trg_imported_records_updated_at
BEFORE UPDATE ON public.imported_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_view_imported_record(_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.imported_records r
    WHERE r.id = _id
      AND (
        r.is_public = true
        OR r.user_id = auth.uid()
        OR public.is_follower_of(r.user_id)
        OR public.is_record_viewer('imported_record'::public.shareable_record_type, r.id)
      )
  );
$$;

ALTER TABLE public.imported_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View imported records"
  ON public.imported_records FOR SELECT
  USING (public.can_view_imported_record(id));

CREATE POLICY "Owners create imported records"
  ON public.imported_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update imported records"
  ON public.imported_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners delete imported records"
  ON public.imported_records FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.record_comments DROP CONSTRAINT IF EXISTS record_comments_record_type_check;
ALTER TABLE public.record_comments ADD CONSTRAINT record_comments_record_type_check
  CHECK (record_type = ANY (ARRAY['debate','live_session','change_my_mind','imported_record']));

ALTER TABLE public.session_notebooks DROP CONSTRAINT IF EXISTS session_notebooks_record_type_chk;
ALTER TABLE public.session_notebooks ADD CONSTRAINT session_notebooks_record_type_chk
  CHECK (record_type = ANY (ARRAY['live_session','debate','change_my_mind','imported_record']));

DELETE FROM public.debates WHERE imported_source_kind IS NOT NULL;