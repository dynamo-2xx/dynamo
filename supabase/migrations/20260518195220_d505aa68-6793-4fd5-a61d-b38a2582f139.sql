
-- §24 Continue button server-side helpers
-- Both functions run as SECURITY DEFINER but explicitly check that the
-- caller owns the source record before cloning.

CREATE OR REPLACE FUNCTION public.continue_debate(
  _source_id uuid,
  _bring_participants boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_src public.debates%ROWTYPE;
  v_new_id uuid := gen_random_uuid();
  v_root uuid;
  v_next_index int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_src FROM public.debates WHERE id = _source_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'source_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_src.created_by <> v_uid THEN
    RAISE EXCEPTION 'only_owner_can_continue' USING ERRCODE = '42501';
  END IF;
  IF v_src.ended_at IS NULL AND v_src.status::text <> 'completed' THEN
    RAISE EXCEPTION 'source_not_completed' USING ERRCODE = 'P0001';
  END IF;

  v_root := COALESCE(v_src.continuation_root_id, v_src.id);

  SELECT COALESCE(MAX(continuation_index), 1) + 1
    INTO v_next_index
    FROM public.debates
   WHERE continuation_root_id = v_root OR id = v_root;

  INSERT INTO public.debates (
    id, created_by, topic, description, is_public, status,
    turns_per_subtopic, time_per_turn, facilitator_type,
    community_tag, institution_tag, topic_category, location,
    prep_time_min, prep_time_max, cover_image_url, format,
    grading_enabled, max_speakers_per_side, feedback_enabled,
    continued_from_id, continuation_index, continuation_root_id
  ) VALUES (
    v_new_id, v_uid, v_src.topic, v_src.description, v_src.is_public, 'draft',
    v_src.turns_per_subtopic, v_src.time_per_turn, v_src.facilitator_type,
    v_src.community_tag, v_src.institution_tag, v_src.topic_category, v_src.location,
    v_src.prep_time_min, v_src.prep_time_max, v_src.cover_image_url, v_src.format,
    v_src.grading_enabled, v_src.max_speakers_per_side, v_src.feedback_enabled,
    _source_id, v_next_index, v_root
  );

  -- Best-effort copy of sides + subtopics if those tables exist
  IF to_regclass('public.debate_sides') IS NOT NULL THEN
    EXECUTE format($f$
      INSERT INTO public.debate_sides (debate_id, name, position, color)
      SELECT %L::uuid, name, position, color
      FROM public.debate_sides WHERE debate_id = %L
    $f$, v_new_id, _source_id);
  END IF;
  IF to_regclass('public.debate_subtopics') IS NOT NULL THEN
    EXECUTE format($f$
      INSERT INTO public.debate_subtopics (debate_id, title, position)
      SELECT %L::uuid, title, position
      FROM public.debate_subtopics WHERE debate_id = %L
    $f$, v_new_id, _source_id);
  END IF;
  IF to_regclass('public.debate_tags') IS NOT NULL THEN
    EXECUTE format($f$
      INSERT INTO public.debate_tags (debate_id, tag_id)
      SELECT %L::uuid, tag_id FROM public.debate_tags WHERE debate_id = %L
      ON CONFLICT DO NOTHING
    $f$, v_new_id, _source_id);
  END IF;

  -- Optional: bring original participants as invitations
  IF _bring_participants AND to_regclass('public.debate_invitations') IS NOT NULL
     AND to_regclass('public.debate_participants') IS NOT NULL THEN
    EXECUTE format($f$
      INSERT INTO public.debate_invitations (debate_id, invited_user_id, status, invited_by)
      SELECT DISTINCT %L::uuid, user_id, 'pending', %L::uuid
        FROM public.debate_participants
       WHERE debate_id = %L AND user_id IS NOT NULL AND user_id <> %L::uuid
      ON CONFLICT DO NOTHING
    $f$, v_new_id, v_uid, _source_id, v_uid);
  END IF;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.continue_debate(uuid, boolean) TO authenticated;


CREATE OR REPLACE FUNCTION public.continue_live_session(
  _source_id uuid,
  _bring_participants boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_src public.live_sessions%ROWTYPE;
  v_new_id uuid := gen_random_uuid();
  v_root uuid;
  v_next_index int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_src FROM public.live_sessions WHERE id = _source_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'source_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_src.created_by <> v_uid THEN
    RAISE EXCEPTION 'only_owner_can_continue' USING ERRCODE = '42501';
  END IF;
  IF v_src.ended_at IS NULL THEN
    RAISE EXCEPTION 'source_not_completed' USING ERRCODE = 'P0001';
  END IF;

  v_root := COALESCE(v_src.continuation_root_id, v_src.id);

  SELECT COALESCE(MAX(continuation_index), 1) + 1
    INTO v_next_index
    FROM public.live_sessions
   WHERE continuation_root_id = v_root OR id = v_root;

  INSERT INTO public.live_sessions (
    id, created_by, title, mode, status, subtopics, speaker_names,
    is_public, cover_image_url, echo_guard,
    continued_from_id, continuation_index, continuation_root_id
  ) VALUES (
    v_new_id, v_uid, v_src.title, v_src.mode, 'recording', v_src.subtopics, v_src.speaker_names,
    v_src.is_public, v_src.cover_image_url, v_src.echo_guard,
    _source_id, v_next_index, v_root
  );

  IF to_regclass('public.live_session_tags') IS NOT NULL THEN
    EXECUTE format($f$
      INSERT INTO public.live_session_tags (live_session_id, tag_id)
      SELECT %L::uuid, tag_id FROM public.live_session_tags WHERE live_session_id = %L
      ON CONFLICT DO NOTHING
    $f$, v_new_id, _source_id);
  END IF;

  -- Live: participants rejoin via the new join_code, so we don't pre-seed them.
  -- _bring_participants currently informs the UI which can fire invite notifications client-side.

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.continue_live_session(uuid, boolean) TO authenticated;
