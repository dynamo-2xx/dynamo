
-- Tables first

CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  cover_image_url text,
  is_public boolean NOT NULL DEFAULT true,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

CREATE TABLE public.club_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','denied')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (club_id, user_id)
);

CREATE TABLE public.club_tags (
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, tag_id)
);

CREATE TABLE public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('debate','live','cmm')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  mode text NOT NULL DEFAULT 'online' CHECK (mode IN ('online','in_person','hybrid')),
  venue text,
  capacity integer,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled')),
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_events_club_starts ON public.club_events(club_id, starts_at);

CREATE TABLE public.club_event_rsvps (
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_club_member(_club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE club_id = _club_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_club_admin(_club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE club_id = _club_id AND user_id = auth.uid() AND role IN ('owner','admin'));
$$;

CREATE OR REPLACE FUNCTION public.is_club_owner(_club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE club_id = _club_id AND user_id = auth.uid() AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION public.can_view_club(_club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club_id AND (c.is_public = true OR public.is_club_member(_club_id))
  );
$$;

-- RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_event_rsvps ENABLE ROW LEVEL SECURITY;

-- clubs policies
CREATE POLICY "View public or member clubs" ON public.clubs FOR SELECT TO authenticated, anon
  USING (is_public = true OR (auth.uid() IS NOT NULL AND public.is_club_member(id)));
CREATE POLICY "Auth users create clubs" ON public.clubs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins update clubs" ON public.clubs FOR UPDATE TO authenticated
  USING (public.is_club_admin(id)) WITH CHECK (public.is_club_admin(id));
CREATE POLICY "Owner deletes club" ON public.clubs FOR DELETE TO authenticated
  USING (public.is_club_owner(id));

-- club_members policies
CREATE POLICY "View members of accessible clubs" ON public.club_members FOR SELECT TO authenticated
  USING (public.can_view_club(club_id));
CREATE POLICY "Self join public club or bootstrap owner" ON public.club_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      (role = 'member' AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.is_public = true))
      OR (role = 'owner' AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.created_by = auth.uid()))
    )
  );
CREATE POLICY "Admins add members" ON public.club_members FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(club_id) AND role IN ('member','admin'));
CREATE POLICY "Admins update member roles" ON public.club_members FOR UPDATE TO authenticated
  USING (public.is_club_admin(club_id) AND role <> 'owner') WITH CHECK (public.is_club_admin(club_id) AND role <> 'owner');
CREATE POLICY "Self leave or admin remove non-owner" ON public.club_members FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND role <> 'owner') OR (public.is_club_admin(club_id) AND role <> 'owner'));

-- club_join_requests policies
CREATE POLICY "Requester or admin views requests" ON public.club_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(club_id));
CREATE POLICY "Self request to private club" ON public.club_join_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.is_public = false)
  );
CREATE POLICY "Admins update requests" ON public.club_join_requests FOR UPDATE TO authenticated
  USING (public.is_club_admin(club_id)) WITH CHECK (public.is_club_admin(club_id));
CREATE POLICY "Requester or admin deletes request" ON public.club_join_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(club_id));

-- club_tags policies
CREATE POLICY "View tags of accessible clubs" ON public.club_tags FOR SELECT TO authenticated, anon
  USING (
    EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.is_public = true)
    OR (auth.uid() IS NOT NULL AND public.can_view_club(club_id))
  );
CREATE POLICY "Admins add tags" ON public.club_tags FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(club_id) AND (SELECT count(*) FROM public.club_tags ct WHERE ct.club_id = club_tags.club_id) < 5);
CREATE POLICY "Admins remove tags" ON public.club_tags FOR DELETE TO authenticated
  USING (public.is_club_admin(club_id));

-- club_events policies
CREATE POLICY "View events of accessible clubs" ON public.club_events FOR SELECT TO authenticated, anon
  USING (
    EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.is_public = true)
    OR (auth.uid() IS NOT NULL AND public.can_view_club(club_id))
  );
CREATE POLICY "Members create events" ON public.club_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_club_member(club_id));
CREATE POLICY "Creator or admin updates events" ON public.club_events FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_club_admin(club_id))
  WITH CHECK (created_by = auth.uid() OR public.is_club_admin(club_id));
CREATE POLICY "Creator or admin deletes events" ON public.club_events FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_club_admin(club_id));

-- club_event_rsvps policies
CREATE POLICY "View RSVPs of accessible events" ON public.club_event_rsvps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.club_events e WHERE e.id = event_id AND public.can_view_club(e.club_id)));
CREATE POLICY "Members RSVP" ON public.club_event_rsvps FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.club_events e WHERE e.id = event_id AND public.is_club_member(e.club_id))
  );
CREATE POLICY "Self update RSVP" ON public.club_event_rsvps FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Self delete RSVP" ON public.club_event_rsvps FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Auto-add creator as owner on club creation
CREATE OR REPLACE FUNCTION public.handle_new_club()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clubs_after_insert AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_club();

CREATE TRIGGER trg_clubs_updated BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_club_events_updated BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
