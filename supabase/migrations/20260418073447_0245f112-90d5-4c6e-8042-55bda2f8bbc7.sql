-- ============================================
-- 1. TAGS
-- ============================================
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  parent_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  created_by uuid,
  is_official boolean NOT NULL DEFAULT false,
  debate_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tags_parent ON public.tags(parent_tag_id);
CREATE INDEX idx_tags_count ON public.tags(debate_count DESC);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'admin'::app_role
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

CREATE POLICY "Anyone can view tags"
ON public.tags FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users can create tags"
ON public.tags FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_official = false);

CREATE POLICY "Admins can update any tag"
ON public.tags FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Creator can delete unused non-official tag"
ON public.tags FOR DELETE TO authenticated
USING (
  (created_by = auth.uid() AND is_official = false AND debate_count = 0)
  OR public.is_admin(auth.uid())
);

CREATE TRIGGER tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. DEBATE_TAGS (M2M)
-- ============================================
CREATE TABLE public.debate_tags (
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (debate_id, tag_id)
);
CREATE INDEX idx_debate_tags_tag ON public.debate_tags(tag_id);

ALTER TABLE public.debate_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view debate tags"
ON public.debate_tags FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Debate creator can add tags"
ON public.debate_tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid())
  AND (SELECT COUNT(*) FROM public.debate_tags dt WHERE dt.debate_id = debate_tags.debate_id) < 5
);

CREATE POLICY "Debate creator can remove tags"
ON public.debate_tags FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid()));

-- ============================================
-- 3. LIVE_SESSION_TAGS (M2M)
-- ============================================
CREATE TABLE public.live_session_tags (
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (live_session_id, tag_id)
);
CREATE INDEX idx_live_session_tags_tag ON public.live_session_tags(tag_id);

ALTER TABLE public.live_session_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live session tags"
ON public.live_session_tags FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Session owner can add tags"
ON public.live_session_tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = live_session_id AND s.created_by = auth.uid())
  AND (SELECT COUNT(*) FROM public.live_session_tags lst WHERE lst.live_session_id = live_session_tags.live_session_id) < 5
);

CREATE POLICY "Session owner can remove tags"
ON public.live_session_tags FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = live_session_id AND s.created_by = auth.uid()));

-- ============================================
-- 4. TAG COUNT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.bump_tag_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags SET debate_count = debate_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags SET debate_count = GREATEST(debate_count - 1, 0) WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER debate_tags_count
AFTER INSERT OR DELETE ON public.debate_tags
FOR EACH ROW EXECUTE FUNCTION public.bump_tag_count();

CREATE TRIGGER live_session_tags_count
AFTER INSERT OR DELETE ON public.live_session_tags
FOR EACH ROW EXECUTE FUNCTION public.bump_tag_count();

-- ============================================
-- 5. SEED OFFICIAL TAGS
-- ============================================
INSERT INTO public.tags (slug, name, is_official, description) VALUES
  ('politics', 'Politics', true, 'Government, policy, and civic affairs'),
  ('education', 'Education', true, 'Schools, learning, and pedagogy'),
  ('technology', 'Technology', true, 'Software, AI, and emerging tech'),
  ('environment', 'Environment', true, 'Climate, sustainability, and nature'),
  ('health', 'Health', true, 'Medicine, public health, and wellness'),
  ('economy', 'Economy', true, 'Markets, labor, and economic policy');

-- ============================================
-- 6. CONNECTIONS (one-way follows)
-- ============================================
CREATE TABLE public.connections (
  follower_id uuid NOT NULL,
  followed_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE INDEX idx_connections_follower ON public.connections(follower_id);
CREATE INDEX idx_connections_followed ON public.connections(followed_id);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their follows and followers"
ON public.connections FOR SELECT TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = followed_id);

CREATE POLICY "Users can follow public profiles"
ON public.connections FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = follower_id
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = followed_id AND is_public = true)
);

CREATE POLICY "Users can unfollow"
ON public.connections FOR DELETE TO authenticated
USING (auth.uid() = follower_id);

-- ============================================
-- 7. USER PRESENCE
-- ============================================
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  visibility text NOT NULL DEFAULT 'followers' CHECK (visibility IN ('public', 'followers', 'private'))
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presence"
ON public.user_presence FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Visible presence based on rules"
ON public.user_presence FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR (visibility = 'followers' AND EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.follower_id = auth.uid() AND c.followed_id = user_presence.user_id
  ))
);

CREATE POLICY "Users insert their own presence"
ON public.user_presence FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own presence"
ON public.user_presence FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. RECOMMENDED USERS RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recommended_users(_limit int DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  affiliation text,
  location text,
  shared_tags text[],
  same_location boolean,
  mutual_count int,
  score int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT user_id, location FROM public.profiles WHERE user_id = auth.uid()
  ),
  my_tags AS (
    SELECT DISTINCT dt.tag_id
    FROM public.debate_tags dt
    JOIN public.debates d ON d.id = dt.debate_id
    WHERE d.created_by = auth.uid()
    UNION
    SELECT DISTINCT dt.tag_id
    FROM public.debate_tags dt
    JOIN public.debate_participants dp ON dp.debate_id = dt.debate_id
    WHERE dp.user_id = auth.uid()
  ),
  my_follows AS (
    SELECT followed_id FROM public.connections WHERE follower_id = auth.uid()
  ),
  candidates AS (
    SELECT p.user_id, p.display_name, p.avatar_url, p.affiliation, p.location
    FROM public.profiles p
    WHERE p.is_public = true
      AND p.user_id <> auth.uid()
      AND p.user_id NOT IN (SELECT followed_id FROM my_follows)
  ),
  scored AS (
    SELECT
      c.user_id, c.display_name, c.avatar_url, c.affiliation, c.location,
      COALESCE((
        SELECT array_agg(DISTINCT t.name)
        FROM public.debate_tags dt
        JOIN public.debates d ON d.id = dt.debate_id
        JOIN public.tags t ON t.id = dt.tag_id
        WHERE d.created_by = c.user_id
          AND dt.tag_id IN (SELECT tag_id FROM my_tags)
      ), ARRAY[]::text[]) AS shared_tags,
      (c.location IS NOT NULL AND c.location = (SELECT location FROM me)) AS same_location,
      (SELECT COUNT(*)::int FROM public.connections c2
        WHERE c2.followed_id = c.user_id
        AND c2.follower_id IN (SELECT followed_id FROM my_follows)
      ) AS mutual_count
    FROM candidates c
  )
  SELECT
    user_id, display_name, avatar_url, affiliation, location,
    shared_tags, same_location, mutual_count,
    (COALESCE(array_length(shared_tags, 1), 0) * 3 + (CASE WHEN same_location THEN 5 ELSE 0 END) + mutual_count * 2)::int AS score
  FROM scored
  WHERE (COALESCE(array_length(shared_tags, 1), 0) > 0 OR same_location OR mutual_count > 0)
  ORDER BY score DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_recommended_users(int) TO authenticated;