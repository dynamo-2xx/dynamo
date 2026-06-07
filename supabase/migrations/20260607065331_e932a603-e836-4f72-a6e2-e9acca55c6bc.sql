ALTER TABLE public.performance_annotations DROP CONSTRAINT IF EXISTS performance_annotations_session_kind_check;
ALTER TABLE public.performance_annotations ADD CONSTRAINT performance_annotations_session_kind_check CHECK (session_kind = ANY (ARRAY['debate'::text, 'cmm'::text, 'live'::text, 'imported'::text]));

DROP POLICY IF EXISTS "perf_ann_view" ON public.performance_annotations;
CREATE POLICY "perf_ann_view" ON public.performance_annotations
  FOR SELECT
  USING (
    ((session_kind = 'debate'::text) AND can_view_debate(session_id))
    OR ((session_kind = 'imported'::text) AND can_view_imported_record(session_id))
    OR (participant_id = auth.uid())
    OR is_admin(auth.uid())
  );