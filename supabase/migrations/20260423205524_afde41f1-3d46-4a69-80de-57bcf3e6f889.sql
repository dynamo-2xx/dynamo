
-- 1. Add columns to debates
ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS grading_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.debates
  ADD CONSTRAINT debates_format_check CHECK (format IN ('standard', 'change_my_mind'));

-- 2. Create cmm_queue table
CREATE TABLE public.cmm_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL,
  user_id uuid NOT NULL,
  position_text text NOT NULL,
  preferred_subtopic_id uuid,
  status text NOT NULL DEFAULT 'waiting',
  queue_index integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cmm_queue_debate ON public.cmm_queue(debate_id, queue_index);
CREATE UNIQUE INDEX idx_cmm_queue_one_active ON public.cmm_queue(debate_id, user_id)
  WHERE status IN ('waiting', 'active');

ALTER TABLE public.cmm_queue ENABLE ROW LEVEL SECURITY;

-- Validation trigger: enforce length, status enum, no owner-self-queue
CREATE OR REPLACE FUNCTION public.cmm_queue_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _format text;
BEGIN
  IF NEW.status NOT IN ('waiting','active','completed','skipped','withdrawn') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;

  IF length(NEW.position_text) > 280 THEN
    RAISE EXCEPTION 'Position text exceeds 280 characters';
  END IF;
  IF length(trim(NEW.position_text)) = 0 THEN
    RAISE EXCEPTION 'Position text required';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT created_by, format INTO _owner, _format FROM public.debates WHERE id = NEW.debate_id;
    IF _owner IS NULL THEN
      RAISE EXCEPTION 'Debate not found';
    END IF;
    IF _format <> 'change_my_mind' THEN
      RAISE EXCEPTION 'Queue only available on Change My Mind debates';
    END IF;
    IF NEW.user_id = _owner THEN
      RAISE EXCEPTION 'Owner cannot queue on their own debate';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER cmm_queue_validate_trg
  BEFORE INSERT OR UPDATE ON public.cmm_queue
  FOR EACH ROW EXECUTE FUNCTION public.cmm_queue_validate();

-- RLS policies
CREATE POLICY "View queue of accessible debates"
  ON public.cmm_queue FOR SELECT
  TO authenticated
  USING (public.can_view_debate(debate_id));

CREATE POLICY "Users can join queue"
  ON public.cmm_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_debate(debate_id));

CREATE POLICY "Challenger withdraws own; owner manages all"
  ON public.cmm_queue FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.debates d WHERE d.id = cmm_queue.debate_id AND d.created_by = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.debates d WHERE d.id = cmm_queue.debate_id AND d.created_by = auth.uid())
  );

CREATE POLICY "Challenger deletes own waiting row"
  ON public.cmm_queue FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'waiting');

-- RPC: join queue (auto-assign queue_index)
CREATE OR REPLACE FUNCTION public.cmm_join_queue(
  _debate_id uuid,
  _position text,
  _preferred_subtopic uuid DEFAULT NULL
)
RETURNS public.cmm_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _next_idx int;
  _row public.cmm_queue;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_view_debate(_debate_id) THEN
    RAISE EXCEPTION 'Cannot view this debate';
  END IF;

  SELECT COALESCE(MAX(queue_index), 0) + 1 INTO _next_idx
  FROM public.cmm_queue WHERE debate_id = _debate_id;

  INSERT INTO public.cmm_queue (debate_id, user_id, position_text, preferred_subtopic_id, queue_index)
  VALUES (_debate_id, _me, _position, _preferred_subtopic, _next_idx)
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

-- RPC: start next challenger (owner only)
CREATE OR REPLACE FUNCTION public.cmm_start_next(_debate_id uuid)
RETURNS public.cmm_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _is_owner boolean;
  _row public.cmm_queue;
  _new_side_id uuid;
  _next_sort int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.debates WHERE id = _debate_id AND created_by = _me) INTO _is_owner;
  IF NOT _is_owner THEN RAISE EXCEPTION 'Only the owner can start rounds'; END IF;

  -- Make sure no active round exists
  IF EXISTS (SELECT 1 FROM public.cmm_queue WHERE debate_id = _debate_id AND status = 'active') THEN
    RAISE EXCEPTION 'A round is already active; end it first';
  END IF;

  SELECT * INTO _row FROM public.cmm_queue
   WHERE debate_id = _debate_id AND status = 'waiting'
   ORDER BY queue_index ASC LIMIT 1;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'No challengers waiting'; END IF;

  -- Create challenger side
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO _next_sort
  FROM public.debate_sides WHERE debate_id = _debate_id;

  INSERT INTO public.debate_sides (debate_id, label, sort_order)
  VALUES (_debate_id, left(_row.position_text, 100), _next_sort)
  RETURNING id INTO _new_side_id;

  -- Add challenger as participant
  INSERT INTO public.debate_participants (debate_id, user_id, side_id, participant_role)
  VALUES (_debate_id, _row.user_id, _new_side_id, 'speaker')
  ON CONFLICT DO NOTHING;

  -- Promote
  UPDATE public.cmm_queue
     SET status = 'active', started_at = now()
   WHERE id = _row.id
   RETURNING * INTO _row;

  -- Lock the debate on first start
  UPDATE public.debates
     SET started_at = COALESCE(started_at, now()),
         status = 'live',
         current_speaker_side_id = _new_side_id
   WHERE id = _debate_id;

  RETURN _row;
END;
$$;

-- RPC: end current round
CREATE OR REPLACE FUNCTION public.cmm_end_round(_debate_id uuid, _outcome text DEFAULT 'completed')
RETURNS public.cmm_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _is_owner boolean;
  _active public.cmm_queue;
  _next public.cmm_queue;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _outcome NOT IN ('completed','skipped') THEN
    RAISE EXCEPTION 'Invalid outcome';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.debates WHERE id = _debate_id AND created_by = _me) INTO _is_owner;
  IF NOT _is_owner THEN RAISE EXCEPTION 'Only the owner can end rounds'; END IF;

  SELECT * INTO _active FROM public.cmm_queue
   WHERE debate_id = _debate_id AND status = 'active' LIMIT 1;
  IF _active.id IS NULL THEN RAISE EXCEPTION 'No active round'; END IF;

  UPDATE public.cmm_queue SET status = _outcome, ended_at = now() WHERE id = _active.id;

  SELECT * INTO _next FROM public.cmm_queue
   WHERE debate_id = _debate_id AND status = 'waiting'
   ORDER BY queue_index ASC LIMIT 1;

  RETURN _next;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cmm_queue;
