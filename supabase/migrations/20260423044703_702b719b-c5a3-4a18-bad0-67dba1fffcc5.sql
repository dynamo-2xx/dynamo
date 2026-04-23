-- Folders table
CREATE TABLE public.notebook_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notebook_folders_user_idx ON public.notebook_folders (user_id, sort_index);

ALTER TABLE public.notebook_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view folders"
  ON public.notebook_folders FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Owner can insert folders"
  ON public.notebook_folders FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update folders"
  ON public.notebook_folders FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete folders"
  ON public.notebook_folders FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_notebook_folders_updated_at
  BEFORE UPDATE ON public.notebook_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend session_notebooks
ALTER TABLE public.session_notebooks
  ADD COLUMN display_title text,
  ADD COLUMN folder_id uuid REFERENCES public.notebook_folders(id) ON DELETE SET NULL,
  ADD COLUMN sort_index int NOT NULL DEFAULT 0,
  ADD COLUMN share_token text UNIQUE,
  ADD COLUMN deleted_at timestamptz;

CREATE INDEX session_notebooks_user_updated_idx
  ON public.session_notebooks (user_id, updated_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX session_notebooks_user_folder_sort_idx
  ON public.session_notebooks (user_id, folder_id, sort_index) WHERE deleted_at IS NULL;

-- Read-only share RPC
CREATE OR REPLACE FUNCTION public.get_shared_notebook(_token text)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  display_title text,
  thoughts jsonb,
  my_take text,
  published boolean,
  published_at timestamptz,
  updated_at timestamptz,
  session_title text,
  session_created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT n.id, n.session_id, n.display_title, n.thoughts, n.my_take,
         n.published, n.published_at, n.updated_at,
         s.title, s.created_at
  FROM public.session_notebooks n
  LEFT JOIN public.live_sessions s ON s.id = n.session_id
  WHERE n.share_token = _token
    AND n.share_token IS NOT NULL
    AND n.deleted_at IS NULL
  LIMIT 1;
$$;