
ALTER TABLE public.performance_annotations
  ADD COLUMN IF NOT EXISTS tag_label text,
  ADD COLUMN IF NOT EXISTS polarity text,
  ADD COLUMN IF NOT EXISTS span_text text,
  ADD COLUMN IF NOT EXISTS cited_entry_ids uuid[];

ALTER TABLE public.performance_annotations
  DROP CONSTRAINT IF EXISTS perf_annotations_polarity_chk;
ALTER TABLE public.performance_annotations
  ADD CONSTRAINT perf_annotations_polarity_chk
  CHECK (polarity IS NULL OR polarity IN ('positive','negative'));

-- Make legacy NOT NULL columns nullable so new-format rows can be inserted without them.
ALTER TABLE public.performance_annotations ALTER COLUMN attribute_group DROP NOT NULL;
ALTER TABLE public.performance_annotations ALTER COLUMN severity DROP NOT NULL;

CREATE INDEX IF NOT EXISTS perf_annotations_session_participant_pass_idx
  ON public.performance_annotations (session_id, session_kind, participant_id, pass_kind);
