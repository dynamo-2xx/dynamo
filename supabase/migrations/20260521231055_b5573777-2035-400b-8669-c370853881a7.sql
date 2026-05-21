
CREATE OR REPLACE FUNCTION public.featured_records(
  p_scope text DEFAULT 'for_you',
  p_viewer uuid DEFAULT NULL,
  p_limit int DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  kind text,
  topic text,
  cover_image_url text,
  status text,
  created_at timestamptz,
  created_by uuid,
  participant_count int,
  comment_count int,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH viewer_loc AS (
    SELECT lower(btrim(location)) AS loc
    FROM public.profiles
    WHERE user_id = p_viewer
    LIMIT 1
  ),
  candidates AS (
    SELECT
      d.id,
      'debate'::text AS kind,
      d.topic AS topic,
      d.cover_image_url,
      d.status::text AS status,
      d.created_at,
      d.created_by,
      COALESCE((SELECT count(*)::int FROM public.debate_participants dp WHERE dp.debate_id = d.id), 0) AS participant_count,
      COALESCE((SELECT count(*)::int FROM public.record_comments rc WHERE rc.record_type = 'debate' AND rc.record_id = d.id), 0) AS comment_count,
      CASE WHEN d.status::text = 'live' THEN 5.0 ELSE 0.0 END AS live_bonus
    FROM public.debates d
    WHERE d.is_public = true
      AND d.status::text <> 'archived'
    UNION ALL
    SELECT
      r.id,
      'imported_record'::text AS kind,
      COALESCE(r.title, 'Imported record') AS topic,
      r.cover_image_url,
      'completed'::text AS status,
      r.created_at,
      r.user_id AS created_by,
      0 AS participant_count,
      COALESCE((SELECT count(*)::int FROM public.record_comments rc WHERE rc.record_type = 'imported_record' AND rc.record_id = r.id), 0) AS comment_count,
      0.0 AS live_bonus
    FROM public.imported_records r
    WHERE r.is_public = true
  ),
  scoped AS (
    SELECT c.*
    FROM candidates c
    WHERE
      CASE
        WHEN p_scope = 'local' THEN
          EXISTS (
            SELECT 1
            FROM public.profiles p, viewer_loc v
            WHERE p.user_id = c.created_by
              AND v.loc IS NOT NULL
              AND v.loc <> ''
              AND lower(btrim(p.location)) = v.loc
          )
        ELSE TRUE
      END
  )
  SELECT
    s.id,
    s.kind,
    s.topic,
    s.cover_image_url,
    s.status,
    s.created_at,
    s.created_by,
    s.participant_count,
    s.comment_count,
    ((s.comment_count * 3.0 + s.participant_count * 2.0)
      * exp(-EXTRACT(epoch FROM (now() - s.created_at)) / (14.0 * 86400.0))
      + s.live_bonus
    ) AS score
  FROM scoped s
  ORDER BY score DESC, s.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.featured_records(text, uuid, int) TO anon, authenticated;
