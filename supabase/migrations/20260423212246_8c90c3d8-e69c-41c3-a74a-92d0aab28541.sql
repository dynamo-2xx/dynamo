-- 1. Add new columns
ALTER TABLE public.session_notebooks
  ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'live_session',
  ADD COLUMN IF NOT EXISTS record_id uuid;

ALTER TABLE public.session_annotations
  ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'live_session',
  ADD COLUMN IF NOT EXISTS record_id uuid;

-- 2. Backfill record_id from session_id
UPDATE public.session_notebooks SET record_id = session_id WHERE record_id IS NULL;
UPDATE public.session_annotations SET record_id = session_id WHERE record_id IS NULL;

-- 3. Make record_id NOT NULL and session_id nullable (legacy mirror)
ALTER TABLE public.session_notebooks ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE public.session_notebooks ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE public.session_annotations ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE public.session_annotations ALTER COLUMN session_id DROP NOT NULL;

-- 4. Drop FKs to live_sessions (polymorphic now)
ALTER TABLE public.session_notebooks DROP CONSTRAINT IF EXISTS session_notebooks_session_id_fkey;
ALTER TABLE public.session_annotations DROP CONSTRAINT IF EXISTS session_annotations_session_id_fkey;

-- 5. Constrain record_type values
ALTER TABLE public.session_notebooks DROP CONSTRAINT IF EXISTS session_notebooks_record_type_chk;
ALTER TABLE public.session_notebooks
  ADD CONSTRAINT session_notebooks_record_type_chk
  CHECK (record_type IN ('live_session','debate','change_my_mind'));

ALTER TABLE public.session_annotations DROP CONSTRAINT IF EXISTS session_annotations_record_type_chk;
ALTER TABLE public.session_annotations
  ADD CONSTRAINT session_annotations_record_type_chk
  CHECK (record_type IN ('live_session','debate','change_my_mind'));

-- 6. Unique index on (record_type, record_id, user_id) for upserts
CREATE UNIQUE INDEX IF NOT EXISTS session_notebooks_record_user_uidx
  ON public.session_notebooks (record_type, record_id, user_id);

CREATE INDEX IF NOT EXISTS session_annotations_record_idx
  ON public.session_annotations (record_type, record_id, user_id);

-- 7. Helper: can_view_record dispatches by type
CREATE OR REPLACE FUNCTION public.can_view_record(_type text, _id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _type = 'live_session' THEN public.can_view_live_session(_id)
    WHEN _type IN ('debate','change_my_mind') THEN public.can_view_debate(_id)
    ELSE false
  END;
$$;

-- 8. Update get_shared_notebook to source title from either table
CREATE OR REPLACE FUNCTION public.get_shared_notebook(_token text)
RETURNS TABLE(id uuid, session_id uuid, display_title text, thoughts jsonb, my_take text, published boolean, published_at timestamp with time zone, updated_at timestamp with time zone, session_title text, session_created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT n.id, n.record_id AS session_id, n.display_title, n.thoughts, n.my_take,
         n.published, n.published_at, n.updated_at,
         CASE
           WHEN n.record_type = 'live_session' THEN s.title
           ELSE d.topic
         END AS session_title,
         CASE
           WHEN n.record_type = 'live_session' THEN s.created_at
           ELSE d.created_at
         END AS session_created_at
  FROM public.session_notebooks n
  LEFT JOIN public.live_sessions s ON s.id = n.record_id AND n.record_type = 'live_session'
  LEFT JOIN public.debates d ON d.id = n.record_id AND n.record_type IN ('debate','change_my_mind')
  WHERE n.share_token = _token
    AND n.share_token IS NOT NULL
    AND n.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_notebook_for_reader(_token text)
RETURNS TABLE(id uuid, session_id uuid, owner_id uuid, display_title text, thoughts jsonb, my_take text, published boolean, published_at timestamp with time zone, updated_at timestamp with time zone, session_title text, session_created_at timestamp with time zone, my_notes jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    n.id,
    n.record_id AS session_id,
    n.user_id AS owner_id,
    n.display_title,
    n.thoughts,
    n.my_take,
    n.published,
    n.published_at,
    n.updated_at,
    CASE
      WHEN n.record_type = 'live_session' THEN s.title
      ELSE d.topic
    END AS session_title,
    CASE
      WHEN n.record_type = 'live_session' THEN s.created_at
      ELSE d.created_at
    END AS session_created_at,
    COALESCE((
      SELECT jsonb_agg(to_jsonb(rn.*) ORDER BY rn.created_at DESC)
      FROM public.notebook_reader_notes rn
      WHERE rn.notebook_id = n.id AND rn.sender_id = auth.uid()
    ), '[]'::jsonb) AS my_notes
  FROM public.session_notebooks n
  LEFT JOIN public.live_sessions s ON s.id = n.record_id AND n.record_type = 'live_session'
  LEFT JOIN public.debates d ON d.id = n.record_id AND n.record_type IN ('debate','change_my_mind')
  WHERE n.share_token = _token
    AND n.share_token IS NOT NULL
    AND n.deleted_at IS NULL
  LIMIT 1;
$$;