CREATE OR REPLACE FUNCTION public.get_recommended_users(_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, affiliation text, location text, is_public boolean, shared_tags text[], same_location boolean, mutual_count integer, follow_status text, score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (SELECT user_id, location FROM public.profiles WHERE user_id = auth.uid()),
  my_tags AS (
    SELECT DISTINCT dt.tag_id FROM public.debate_tags dt
    JOIN public.debates d ON d.id = dt.debate_id WHERE d.created_by = auth.uid()
    UNION
    SELECT DISTINCT dt.tag_id FROM public.debate_tags dt
    JOIN public.debate_participants dp ON dp.debate_id = dt.debate_id WHERE dp.user_id = auth.uid()
  ),
  my_follows AS (SELECT followed_id FROM public.connections WHERE follower_id = auth.uid()),
  my_pending AS (
    SELECT target_id FROM public.follow_requests
    WHERE requester_id = auth.uid() AND status = 'pending'
  ),
  candidates AS (
    SELECT p.user_id, p.display_name, p.avatar_url, p.affiliation, p.location, p.is_public, p.created_at
    FROM public.profiles p
    WHERE p.user_id <> auth.uid()
      AND p.user_id NOT IN (SELECT followed_id FROM my_follows)
  ),
  scored AS (
    SELECT c.user_id, c.display_name, c.avatar_url, c.affiliation, c.location, c.is_public, c.created_at,
      COALESCE((
        SELECT array_agg(DISTINCT t.name)
        FROM public.debate_tags dt
        JOIN public.debates d ON d.id = dt.debate_id
        JOIN public.tags t ON t.id = dt.tag_id
        WHERE d.created_by = c.user_id AND dt.tag_id IN (SELECT tag_id FROM my_tags)
      ), ARRAY[]::text[]) AS shared_tags,
      (c.location IS NOT NULL AND c.location = (SELECT location FROM me)) AS same_location,
      (SELECT COUNT(*)::int FROM public.connections c2
        WHERE c2.followed_id = c.user_id
          AND c2.follower_id IN (SELECT followed_id FROM my_follows)) AS mutual_count,
      CASE WHEN c.user_id IN (SELECT target_id FROM my_pending) THEN 'pending' ELSE 'none' END AS follow_status
    FROM candidates c
  )
  SELECT user_id, display_name, avatar_url, affiliation, location, is_public,
    shared_tags, same_location, mutual_count, follow_status,
    (COALESCE(array_length(shared_tags, 1), 0) * 3
      + (CASE WHEN same_location THEN 5 ELSE 0 END) + mutual_count * 2)::int AS score
  FROM scored
  ORDER BY score DESC, created_at DESC
  LIMIT _limit;
$function$;