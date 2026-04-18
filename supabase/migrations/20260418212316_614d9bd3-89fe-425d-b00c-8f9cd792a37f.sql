CREATE OR REPLACE FUNCTION public.debate_tag_count(_debate_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.debate_tags WHERE debate_id = _debate_id;
$$;

DROP POLICY IF EXISTS "Debate creator can add tags" ON public.debate_tags;

CREATE POLICY "Debate creator can add tags"
ON public.debate_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = debate_tags.debate_id AND d.created_by = auth.uid()
  )
  AND public.debate_tag_count(debate_tags.debate_id) < 5
);