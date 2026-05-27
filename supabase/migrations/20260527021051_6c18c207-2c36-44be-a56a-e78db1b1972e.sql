-- Add club scoping to takes
ALTER TABLE public.takes ADD COLUMN IF NOT EXISTS club_id uuid NULL;
CREATE INDEX IF NOT EXISTS takes_club_id_created_at_idx
  ON public.takes (club_id, created_at DESC)
  WHERE club_id IS NOT NULL;

-- Tighten insert/update: if club_id is set, author must be a member of that club
DROP POLICY IF EXISTS "Author inserts takes" ON public.takes;
CREATE POLICY "Author inserts takes"
ON public.takes
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (club_id IS NULL OR public.is_club_member(club_id))
);

DROP POLICY IF EXISTS "Author updates takes" ON public.takes;
CREATE POLICY "Author updates takes"
ON public.takes
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (
  author_id = auth.uid()
  AND (club_id IS NULL OR public.is_club_member(club_id))
);

-- Club pinned items (admin curation, surfaced like a "Featured" row)
CREATE TABLE IF NOT EXISTS public.club_pinned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('record', 'take', 'notebook')),
  target_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  pinned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, kind, target_id)
);

GRANT SELECT ON public.club_pinned_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_pinned_items TO authenticated;
GRANT ALL ON public.club_pinned_items TO service_role;

ALTER TABLE public.club_pinned_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View pinned for accessible clubs"
ON public.club_pinned_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_pinned_items.club_id AND c.is_public = true
  )
  OR (auth.uid() IS NOT NULL AND public.can_view_club(club_id))
);

CREATE POLICY "Admins pin items"
ON public.club_pinned_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_club_admin(club_id) AND pinned_by = auth.uid());

CREATE POLICY "Admins update pins"
ON public.club_pinned_items
FOR UPDATE
TO authenticated
USING (public.is_club_admin(club_id))
WITH CHECK (public.is_club_admin(club_id));

CREATE POLICY "Admins unpin"
ON public.club_pinned_items
FOR DELETE
TO authenticated
USING (public.is_club_admin(club_id));

CREATE INDEX IF NOT EXISTS club_pinned_items_club_idx
  ON public.club_pinned_items (club_id, sort_order, created_at DESC);