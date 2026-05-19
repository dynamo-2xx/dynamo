-- §24 Continue button — RPCs for debate + live continuations
-- Both functions: SECURITY DEFINER, owner-only, completed-only, linear chain.

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
  v_src debates%ROWTYPE;
  v_new_id uuid;
  v_root uuid;
  v_next_index int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT * INTO v_src FROM debates WHERE id = _source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_not_found'; END IF;
  IF v_src.created_by <> v_uid THEN RAISE EXCEPTION 'only_owner_can_continue'; END IF;
  IF v_src.status <> 'completed' THEN RAISE EXCEPTION 'source_not_completed'; END IF;

  v_root := COALESCE(v_src.continuation_root_id, v_src.id);
  SELECT COALESCE(MAX(continuation_index), 1) + 1
    INTO v_next_index
    FROM debates
   WHERE continuation_root_id = v_root OR id = v_root;

  INSERT INTO debates (
    created_by, topic, description, is_public, status,
    turns_per_subtopic, time_per_turn, facilitator_type,
    community_tag, institution_tag, topic_category, location,
    prep_time_min, prep_time_max, cover_image_url,
    feedback_enabled, format, grading_enabled,
    continued_from_id, continuation_root_id, continuation_index
  ) VALUES (
    v_uid, v_src.topic, v_src.description, false, 'draft',
    v_src.turns_per_subtopic, v_src.time_per_turn, v_src.facilitator_type,
    v_src.community_tag, v_src.institution_tag, v_src.topic_category, v_src.location,
    v_src.prep_time_min, v_src.prep_time_max, v_src.cover_image_url,
    v_src.feedback_enabled, v_src.format, v_src.grading_enabled,
    v_src.id, v_root, v_next_index
  ) RETURNING id INTO v_new_id;

  -- Clone subtopics
  INSERT INTO debate_subtopics (debate_id, title, sort_order)
  SELECT v_new_id, title, sort_order FROM debate_subtopics WHERE debate_id = v_src.id;

  -- Clone sides
  INSERT INTO debate_sides (debate_id, label, sort_order)
  SELECT v_new_id, label, sort_order FROM debate_sides WHERE debate_id = v_src.id;

  -- Clone tags
  INSERT INTO debate_tags (debate_id, tag_id)
  SELECT v_new_id, tag_id FROM debate_tags WHERE debate_id = v_src.id
  ON CONFLICT DO NOTHING;

  -- Optionally bring participants (re-invite speakers; skip owner)
  IF _bring_participants THEN
    INSERT INTO debate_participants (debate_id, user_id, side_id, participant_role)
    SELECT v_new_id, dp.user_id, NULL, dp.participant_role
      FROM debate_participants dp
     WHERE dp.debate_id = v_src.id AND dp.user_id <> v_uid
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_new_id;
END;
$$;

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
  v_src live_sessions%ROWTYPE;
  v_new_id uuid;
  v_root uuid;
  v_next_index int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT * INTO v_src FROM live_sessions WHERE id = _source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_not_found'; END IF;
  IF v_src.created_by <> v_uid THEN RAISE EXCEPTION 'only_owner_can_continue'; END IF;
  IF v_src.status <> 'completed' AND v_src.ended_at IS NULL THEN
    RAISE EXCEPTION 'source_not_completed';
  END IF;

  v_root := COALESCE(v_src.continuation_root_id, v_src.id);
  SELECT COALESCE(MAX(continuation_index), 1) + 1
    INTO v_next_index
    FROM live_sessions
   WHERE continuation_root_id = v_root OR id = v_root;

  INSERT INTO live_sessions (
    created_by, title, mode, status,
    subtopics, speaker_names, cover_image_url, echo_guard, is_public,
    continued_from_id, continuation_root_id, continuation_index
  ) VALUES (
    v_uid, v_src.title, v_src.mode, 'recording',
    v_src.subtopics, v_src.speaker_names, v_src.cover_image_url, v_src.echo_guard, false,
    v_src.id, v_root, v_next_index
  ) RETURNING id INTO v_new_id;

  IF _bring_participants THEN
    INSERT INTO live_session_participants (session_id, device_id, user_id, display_name, avatar_url, speaker_slot)
    SELECT v_new_id, device_id, user_id, display_name, avatar_url, speaker_slot
      FROM live_session_participants
     WHERE session_id = v_src.id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.continue_debate(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.continue_live_session(uuid, boolean) TO authenticated;