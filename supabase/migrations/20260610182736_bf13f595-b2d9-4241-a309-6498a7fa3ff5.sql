
CREATE TABLE public.argument_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  session_kind TEXT NOT NULL CHECK (session_kind IN ('debate','cmm','live','imported')),
  subtopic_id UUID,
  subtopic_title TEXT,
  thread_id UUID NOT NULL,
  turn_index INTEGER NOT NULL DEFAULT 0,
  speaker_label TEXT,
  speaker_side TEXT,
  source_text TEXT NOT NULL,
  anatomy JSONB NOT NULL DEFAULT '[]'::jsonb,
  relationship_tag TEXT NOT NULL CHECK (relationship_tag IN (
    'ANCHOR','SUPPORT','CHALLENGE','COUNTER','EXTENSION','CONCESSION',
    'REFRAME','QUALIFICATION','SYNTHESIS','PIVOT','UNRESOLVED'
  )),
  relates_to UUID REFERENCES public.argument_units(id) ON DELETE SET NULL,
  relationship_note TEXT,
  is_standalone_concession BOOLEAN NOT NULL DEFAULT false,
  pass_kind TEXT NOT NULL DEFAULT 'structure_live' CHECK (pass_kind IN ('structure_live','structure_final')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX argument_units_session_idx ON public.argument_units(session_id, session_kind);
CREATE INDEX argument_units_thread_idx ON public.argument_units(session_id, session_kind, thread_id, turn_index);

GRANT SELECT ON public.argument_units TO authenticated;
GRANT ALL ON public.argument_units TO service_role;

ALTER TABLE public.argument_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "argument_units_no_client_write"
  ON public.argument_units FOR INSERT
  WITH CHECK (false);

CREATE POLICY "argument_units_view"
  ON public.argument_units FOR SELECT
  USING (
    (session_kind = 'debate' AND public.can_view_debate(session_id))
    OR (session_kind = 'imported' AND public.can_view_imported_record(session_id))
    OR (session_kind IN ('live','cmm'))
  );

CREATE TRIGGER update_argument_units_updated_at
  BEFORE UPDATE ON public.argument_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.argument_units;
