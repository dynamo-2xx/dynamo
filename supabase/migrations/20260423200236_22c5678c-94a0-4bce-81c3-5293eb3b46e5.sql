
-- 1. Add metadata column to dm_messages for tagging notebook-note messages
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Notebook reader notes table
CREATE TABLE public.notebook_reader_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES public.session_notebooks(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  anchor_kind text,            -- 'thought' | 'my_take' | null
  anchor_excerpt text,
  anchor_char_start integer,
  anchor_char_end integer,
  dm_thread_id uuid,
  dismissed_from_thoughts boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notebook_reader_notes_anchor_kind_chk
    CHECK (anchor_kind IS NULL OR anchor_kind IN ('thought','my_take'))
);

CREATE INDEX idx_nrn_notebook ON public.notebook_reader_notes(notebook_id, created_at DESC);
CREATE INDEX idx_nrn_sender ON public.notebook_reader_notes(sender_id, created_at DESC);

ALTER TABLE public.notebook_reader_notes ENABLE ROW LEVEL SECURITY;

-- 3. Helper: is_notebook_owner
CREATE OR REPLACE FUNCTION public.is_notebook_owner(_notebook_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.session_notebooks n
    WHERE n.id = _notebook_id AND n.user_id = auth.uid()
  );
$$;

-- 4. RLS policies

-- Sender can SELECT own notes
CREATE POLICY "Sender can view own notes"
  ON public.notebook_reader_notes FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

-- Owner can SELECT all notes on own notebook
CREATE POLICY "Owner can view notes on own notebook"
  ON public.notebook_reader_notes FOR SELECT
  TO authenticated
  USING (public.is_notebook_owner(notebook_id));

-- Sender can INSERT if signed in AND notebook has a share_token
CREATE POLICY "Sender can insert notes on shared notebook"
  ON public.notebook_reader_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.session_notebooks n
      WHERE n.id = notebook_id
        AND n.share_token IS NOT NULL
        AND n.deleted_at IS NULL
    )
  );

-- Sender can UPDATE own notes
CREATE POLICY "Sender can update own notes"
  ON public.notebook_reader_notes FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Owner can UPDATE notes on own notebook (mark read / dismiss)
CREATE POLICY "Owner can update notes on own notebook"
  ON public.notebook_reader_notes FOR UPDATE
  TO authenticated
  USING (public.is_notebook_owner(notebook_id))
  WITH CHECK (public.is_notebook_owner(notebook_id));

-- Sender can DELETE own notes
CREATE POLICY "Sender can delete own notes"
  ON public.notebook_reader_notes FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- 5. updated_at trigger
CREATE TRIGGER trg_nrn_updated_at
BEFORE UPDATE ON public.notebook_reader_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. submit_reader_note RPC
CREATE OR REPLACE FUNCTION public.submit_reader_note(
  _token text,
  _body text,
  _anchor_kind text DEFAULT NULL,
  _anchor_excerpt text DEFAULT NULL,
  _anchor_char_start integer DEFAULT NULL,
  _anchor_char_end integer DEFAULT NULL
)
RETURNS public.notebook_reader_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _notebook_id uuid;
  _owner_id uuid;
  _thread_id uuid;
  _note public.notebook_reader_notes;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN
    RAISE EXCEPTION 'Note body required';
  END IF;

  SELECT n.id, n.user_id INTO _notebook_id, _owner_id
  FROM public.session_notebooks n
  WHERE n.share_token = _token
    AND n.share_token IS NOT NULL
    AND n.deleted_at IS NULL
  LIMIT 1;

  IF _notebook_id IS NULL THEN
    RAISE EXCEPTION 'Notebook not found';
  END IF;
  IF _owner_id = _me THEN
    RAISE EXCEPTION 'Cannot leave a note on your own notebook';
  END IF;

  -- Create / fetch DM thread (owner ↔ sender)
  _thread_id := public.get_or_create_dm_thread(_owner_id, NULL);

  -- Insert note
  INSERT INTO public.notebook_reader_notes (
    notebook_id, sender_id, body,
    anchor_kind, anchor_excerpt, anchor_char_start, anchor_char_end,
    dm_thread_id
  )
  VALUES (
    _notebook_id, _me, _body,
    _anchor_kind, _anchor_excerpt, _anchor_char_start, _anchor_char_end,
    _thread_id
  )
  RETURNING * INTO _note;

  -- Mirror into DMs
  INSERT INTO public.dm_messages (thread_id, sender_id, body, metadata)
  VALUES (
    _thread_id, _me, _body,
    jsonb_build_object('kind', 'notebook_note', 'notebook_id', _notebook_id, 'note_id', _note.id)
  );

  RETURN _note;
END;
$$;

-- 7. get_shared_notebook_for_reader RPC (notebook + caller's own notes)
CREATE OR REPLACE FUNCTION public.get_shared_notebook_for_reader(_token text)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  owner_id uuid,
  display_title text,
  thoughts jsonb,
  my_take text,
  published boolean,
  published_at timestamptz,
  updated_at timestamptz,
  session_title text,
  session_created_at timestamptz,
  my_notes jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.session_id,
    n.user_id AS owner_id,
    n.display_title,
    n.thoughts,
    n.my_take,
    n.published,
    n.published_at,
    n.updated_at,
    s.title AS session_title,
    s.created_at AS session_created_at,
    COALESCE((
      SELECT jsonb_agg(to_jsonb(rn.*) ORDER BY rn.created_at DESC)
      FROM public.notebook_reader_notes rn
      WHERE rn.notebook_id = n.id AND rn.sender_id = auth.uid()
    ), '[]'::jsonb) AS my_notes
  FROM public.session_notebooks n
  LEFT JOIN public.live_sessions s ON s.id = n.session_id
  WHERE n.share_token = _token
    AND n.share_token IS NOT NULL
    AND n.deleted_at IS NULL
  LIMIT 1;
$$;

-- 8. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notebook_reader_notes;
ALTER TABLE public.notebook_reader_notes REPLICA IDENTITY FULL;
