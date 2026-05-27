-- Per-item edits for round_summaries.key_arguments. The summary array is
-- AI-generated and shared; this overlay lets the speaker whose side a key
-- argument is attributed to revise the wording without mutating the original.
CREATE TABLE public.round_summary_item_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL,
  round_summary_id uuid NOT NULL,
  item_index integer NOT NULL,
  side_label text NOT NULL,
  original_content text NOT NULL,
  edited_content text NOT NULL,
  edited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_summary_id, item_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_summary_item_edits TO authenticated;
GRANT ALL ON public.round_summary_item_edits TO service_role;

ALTER TABLE public.round_summary_item_edits ENABLE ROW LEVEL SECURITY;

-- View: anyone who can view the debate can see edits.
CREATE POLICY "View edits on viewable debates"
ON public.round_summary_item_edits
FOR SELECT TO authenticated
USING (public.can_view_debate(debate_id));

-- Insert/Update/Delete: only a speaker whose side matches side_label, and the
-- editor must be the current user.
CREATE POLICY "Speakers edit own side summaries (insert)"
ON public.round_summary_item_edits
FOR INSERT TO authenticated
WITH CHECK (
  edited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.debate_participants dp
    JOIN public.debate_sides ds ON ds.id = dp.side_id
    WHERE dp.debate_id = round_summary_item_edits.debate_id
      AND dp.user_id = auth.uid()
      AND dp.participant_role = 'speaker'
      AND lower(ds.label) = lower(round_summary_item_edits.side_label)
  )
);

CREATE POLICY "Speakers edit own side summaries (update)"
ON public.round_summary_item_edits
FOR UPDATE TO authenticated
USING (
  edited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.debate_participants dp
    JOIN public.debate_sides ds ON ds.id = dp.side_id
    WHERE dp.debate_id = round_summary_item_edits.debate_id
      AND dp.user_id = auth.uid()
      AND dp.participant_role = 'speaker'
      AND lower(ds.label) = lower(round_summary_item_edits.side_label)
  )
)
WITH CHECK (edited_by = auth.uid());

CREATE POLICY "Speakers delete own side summaries"
ON public.round_summary_item_edits
FOR DELETE TO authenticated
USING (edited_by = auth.uid());

CREATE TRIGGER update_round_summary_item_edits_updated_at
BEFORE UPDATE ON public.round_summary_item_edits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rsie_debate ON public.round_summary_item_edits(debate_id);
CREATE INDEX idx_rsie_summary ON public.round_summary_item_edits(round_summary_id);