
-- 1) New table: takes (standalone My Takes)
CREATE TABLE public.takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  body text NOT NULL,
  parent_take_id uuid NULL REFERENCES public.takes(id) ON DELETE SET NULL,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  location text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT takes_body_len CHECK (char_length(body) BETWEEN 1 AND 2000)
);

GRANT SELECT ON public.takes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.takes TO authenticated;
GRANT ALL ON public.takes TO service_role;

ALTER TABLE public.takes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public takes are viewable by anyone"
  ON public.takes FOR SELECT
  TO anon, authenticated
  USING (is_public = true OR author_id = auth.uid());

CREATE POLICY "Authors create own takes"
  ON public.takes FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors update own takes"
  ON public.takes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors delete own takes"
  ON public.takes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

CREATE INDEX takes_created_at_idx ON public.takes (created_at DESC) WHERE is_public = true;
CREATE INDEX takes_author_created_idx ON public.takes (author_id, created_at DESC);
CREATE INDEX takes_location_created_idx ON public.takes (location, created_at DESC) WHERE is_public = true;

CREATE TRIGGER takes_set_updated_at
BEFORE UPDATE ON public.takes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Add publish_caption to notebooks
ALTER TABLE public.session_notebooks
  ADD COLUMN IF NOT EXISTS publish_caption text NULL;
