DROP FUNCTION IF EXISTS public.get_shared_live_session(text);

CREATE OR REPLACE FUNCTION public.get_shared_live_session(_token text)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  cover_image_url text,
  status text,
  mode text,
  transcript_entries jsonb,
  summaries jsonb,
  subtopics jsonb,
  speaker_names jsonb,
  created_by uuid,
  created_at timestamp with time zone,
  ended_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, title, description, cover_image_url, status, mode,
         transcript_entries, summaries, subtopics, speaker_names,
         created_by, created_at, ended_at
  FROM public.live_sessions
  WHERE share_token = _token AND share_token IS NOT NULL
  LIMIT 1;
$function$;