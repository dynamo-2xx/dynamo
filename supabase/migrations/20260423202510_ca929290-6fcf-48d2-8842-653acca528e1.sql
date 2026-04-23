
ALTER TABLE public.profiles ALTER COLUMN is_public SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_public)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_card(_user_id uuid)
RETURNS TABLE(
  user_id uuid, display_name text, avatar_url text, banner_url text,
  affiliation text, role app_role, is_public boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT user_id, display_name, avatar_url, banner_url, affiliation, role, is_public, created_at
  FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_card(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_profile_cards(_q text, _limit int DEFAULT 20)
RETURNS TABLE(
  user_id uuid, display_name text, avatar_url text, banner_url text,
  affiliation text, role app_role, is_public boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT user_id, display_name, avatar_url, banner_url, affiliation, role, is_public, created_at
  FROM public.profiles
  WHERE _q IS NOT NULL AND length(trim(_q)) > 0
    AND (display_name ILIKE '%' || _q || '%' OR affiliation ILIKE '%' || _q || '%')
  ORDER BY (display_name ILIKE _q || '%') DESC, display_name ASC
  LIMIT GREATEST(_limit, 1);
$$;
GRANT EXECUTE ON FUNCTION public.search_profile_cards(text, int) TO anon, authenticated;

CREATE TABLE public.follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT follow_requests_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT follow_requests_no_self CHECK (requester_id <> target_id)
);
CREATE UNIQUE INDEX follow_requests_pending_unique
  ON public.follow_requests (requester_id, target_id) WHERE status = 'pending';
CREATE INDEX follow_requests_target_status_idx
  ON public.follow_requests (target_id, status);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can insert" ON public.follow_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Requester views own" ON public.follow_requests
  FOR SELECT TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "Requester deletes own" ON public.follow_requests
  FOR DELETE TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "Target views incoming" ON public.follow_requests
  FOR SELECT TO authenticated USING (auth.uid() = target_id);
CREATE POLICY "Target updates incoming" ON public.follow_requests
  FOR UPDATE TO authenticated USING (auth.uid() = target_id) WITH CHECK (auth.uid() = target_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_requests;
ALTER TABLE public.follow_requests REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.request_follow(_target uuid)
RETURNS TABLE(status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _is_public boolean;
  _existing uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _target = _me THEN RAISE EXCEPTION 'Cannot follow yourself'; END IF;
  SELECT p.is_public INTO _is_public FROM public.profiles p WHERE p.user_id = _target;
  IF _is_public IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.connections WHERE follower_id = _me AND followed_id = _target) THEN
    RETURN QUERY SELECT 'following'::text; RETURN;
  END IF;
  IF _is_public THEN
    INSERT INTO public.connections (follower_id, followed_id) VALUES (_me, _target)
    ON CONFLICT DO NOTHING;
    RETURN QUERY SELECT 'following'::text; RETURN;
  END IF;
  SELECT id INTO _existing FROM public.follow_requests
   WHERE requester_id = _me AND target_id = _target AND status = 'pending' LIMIT 1;
  IF _existing IS NULL THEN
    INSERT INTO public.follow_requests (requester_id, target_id) VALUES (_me, _target);
    INSERT INTO public.notifications (recipient_id, actor_id, type, title, body)
    VALUES (_target, _me, 'follow_request', 'New follow request', 'Someone wants to follow you.');
  END IF;
  RETURN QUERY SELECT 'requested'::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_follow(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_follow_request(_request_id uuid, _accept boolean)
RETURNS TABLE(status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _req public.follow_requests;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _req FROM public.follow_requests WHERE id = _request_id;
  IF _req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.target_id <> _me THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _req.status <> 'pending' THEN
    RETURN QUERY SELECT _req.status; RETURN;
  END IF;
  IF _accept THEN
    INSERT INTO public.connections (follower_id, followed_id)
    VALUES (_req.requester_id, _req.target_id) ON CONFLICT DO NOTHING;
    UPDATE public.follow_requests SET status = 'accepted', responded_at = now() WHERE id = _request_id;
    INSERT INTO public.notifications (recipient_id, actor_id, type, title, body)
    VALUES (_req.requester_id, _me, 'follow_request_accepted', 'Follow request accepted', 'You can now see updates.');
    RETURN QUERY SELECT 'accepted'::text;
  ELSE
    UPDATE public.follow_requests SET status = 'declined', responded_at = now() WHERE id = _request_id;
    INSERT INTO public.notifications (recipient_id, actor_id, type, title, body)
    VALUES (_req.requester_id, _me, 'follow_request_declined', 'Follow request declined', NULL);
    RETURN QUERY SELECT 'declined'::text;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.respond_follow_request(uuid, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.get_recommended_users(integer);

CREATE OR REPLACE FUNCTION public.get_recommended_users(_limit integer DEFAULT 10)
RETURNS TABLE(
  user_id uuid, display_name text, avatar_url text, affiliation text, location text,
  is_public boolean, shared_tags text[], same_location boolean, mutual_count integer,
  follow_status text, score integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
    SELECT p.user_id, p.display_name, p.avatar_url, p.affiliation, p.location, p.is_public
    FROM public.profiles p
    WHERE p.user_id <> auth.uid()
      AND p.user_id NOT IN (SELECT followed_id FROM my_follows)
  ),
  scored AS (
    SELECT c.user_id, c.display_name, c.avatar_url, c.affiliation, c.location, c.is_public,
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
  WHERE (COALESCE(array_length(shared_tags, 1), 0) > 0 OR same_location OR mutual_count > 0)
  ORDER BY score DESC LIMIT _limit;
$$;
