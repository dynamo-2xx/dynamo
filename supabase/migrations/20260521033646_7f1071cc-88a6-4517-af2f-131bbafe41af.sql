DROP FUNCTION IF EXISTS public.get_shared_notebook(text);
DROP FUNCTION IF EXISTS public.get_shared_notebook_for_reader(text);

CREATE OR REPLACE FUNCTION public.get_shared_notebook(_token text)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  record_type text,
  display_title text,
  thoughts jsonb,
  my_take text,
  published boolean,
  published_at timestamp with time zone,
  updated_at timestamp with time zone,
  session_title text,
  session_created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT n.id, n.record_id AS session_id, n.record_type::text,
         n.display_title, n.thoughts, n.my_take,
         n.published, n.published_at, n.updated_at,
         CASE WHEN n.record_type = 'live_session' THEN s.title ELSE d.topic END AS session_title,
         CASE WHEN n.record_type = 'live_session' THEN s.created_at ELSE d.created_at END AS session_created_at
  FROM public.session_notebooks n
  LEFT JOIN public.live_sessions s ON s.id = n.record_id AND n.record_type = 'live_session'
  LEFT JOIN public.debates d ON d.id = n.record_id AND n.record_type IN ('debate','change_my_mind')
  WHERE n.share_token = _token
    AND n.share_token IS NOT NULL
    AND n.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_notebook_for_reader(_token text)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  owner_id uuid,
  record_type text,
  display_title text,
  thoughts jsonb,
  my_take text,
  published boolean,
  published_at timestamp with time zone,
  updated_at timestamp with time zone,
  session_title text,
  session_created_at timestamp with time zone,
  my_notes jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    n.id,
    n.record_id AS session_id,
    n.user_id AS owner_id,
    n.record_type::text,
    n.display_title,
    n.thoughts,
    n.my_take,
    n.published,
    n.published_at,
    n.updated_at,
    CASE WHEN n.record_type = 'live_session' THEN s.title ELSE d.topic END AS session_title,
    CASE WHEN n.record_type = 'live_session' THEN s.created_at ELSE d.created_at END AS session_created_at,
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