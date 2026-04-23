
-- session_notebooks
CREATE TABLE public.session_notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  thoughts jsonb NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  my_take text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
ALTER TABLE public.session_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own notebook"
ON public.session_notebooks FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Anyone can view published notebooks"
ON public.session_notebooks FOR SELECT TO anon, authenticated
USING (published = true);

CREATE POLICY "Owner can insert notebook"
ON public.session_notebooks FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update notebook"
ON public.session_notebooks FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete notebook"
ON public.session_notebooks FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER trg_session_notebooks_updated
BEFORE UPDATE ON public.session_notebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_session_notebooks_session_user ON public.session_notebooks(session_id, user_id);
CREATE INDEX idx_session_notebooks_published ON public.session_notebooks(user_id) WHERE published = true;


-- session_annotations
CREATE TABLE public.session_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  node_kind text NOT NULL CHECK (node_kind IN ('summary','transcript')),
  node_id text NOT NULL,
  excerpt text NOT NULL,
  note text NOT NULL DEFAULT '',
  char_start int,
  char_end int,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own annotations"
ON public.session_annotations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owner can insert annotations"
ON public.session_annotations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update own annotations"
ON public.session_annotations FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete own annotations"
ON public.session_annotations FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_session_annotations_session_user ON public.session_annotations(session_id, user_id);


-- session_cross_refs
CREATE TABLE public.session_cross_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  from_node text NOT NULL,
  to_node text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('contradiction','shared_evidence','restated')),
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_cross_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View cross-refs of accessible sessions"
ON public.session_cross_refs FOR SELECT TO anon, authenticated
USING (public.can_view_live_session(session_id));

CREATE POLICY "Host can insert cross-refs"
ON public.session_cross_refs FOR INSERT TO authenticated
WITH CHECK (public.is_live_session_host(session_id));

CREATE POLICY "Host can update cross-refs"
ON public.session_cross_refs FOR UPDATE TO authenticated
USING (public.is_live_session_host(session_id))
WITH CHECK (public.is_live_session_host(session_id));

CREATE POLICY "Host can delete cross-refs"
ON public.session_cross_refs FOR DELETE TO authenticated
USING (public.is_live_session_host(session_id));

CREATE INDEX idx_session_cross_refs_session ON public.session_cross_refs(session_id);


-- session_citations
CREATE TABLE public.session_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  summary_node_id text NOT NULL,
  text text NOT NULL,
  url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View citations of accessible sessions"
ON public.session_citations FOR SELECT TO anon, authenticated
USING (public.can_view_live_session(session_id));

CREATE POLICY "Host can insert citations"
ON public.session_citations FOR INSERT TO authenticated
WITH CHECK (public.is_live_session_host(session_id) AND created_by = auth.uid());

CREATE POLICY "Host can update citations"
ON public.session_citations FOR UPDATE TO authenticated
USING (public.is_live_session_host(session_id))
WITH CHECK (public.is_live_session_host(session_id));

CREATE POLICY "Host can delete citations"
ON public.session_citations FOR DELETE TO authenticated
USING (public.is_live_session_host(session_id));

CREATE INDEX idx_session_citations_session ON public.session_citations(session_id);
