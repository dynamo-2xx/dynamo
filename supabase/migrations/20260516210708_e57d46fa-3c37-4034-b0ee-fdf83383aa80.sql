-- ============================================================
-- §23 — Record Sharing, Co-ownership & Pause foundation
-- ============================================================

-- Enums
CREATE TYPE public.record_share_role AS ENUM ('viewer', 'co_owner');
CREATE TYPE public.record_change_type AS ENUM (
  'edit_metadata','edit_content','invite_user','remove_user',
  'toggle_publish','propose_delete','propose_transfer'
);
CREATE TYPE public.record_change_status AS ENUM ('pending','approved','rejected','withdrawn');
CREATE TYPE public.shareable_record_type AS ENUM ('debate','change_my_mind','live_session','notebook');

-- ============================================================
-- Columns on existing tables
-- ============================================================
ALTER TABLE public.debates
  ADD COLUMN IF NOT EXISTS forked_from_id uuid REFERENCES public.debates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forked_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS pause_reason text;

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS forked_from_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forked_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

ALTER TABLE public.session_notebooks
  ADD COLUMN IF NOT EXISTS forked_from_id uuid REFERENCES public.session_notebooks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forked_at timestamptz;

-- ============================================================
-- record_shares
-- ============================================================
CREATE TABLE public.record_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type public.shareable_record_type NOT NULL,
  record_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.record_share_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (record_type, record_id, user_id)
);
CREATE INDEX idx_record_shares_user ON public.record_shares (user_id);
CREATE INDEX idx_record_shares_record ON public.record_shares (record_type, record_id);

ALTER TABLE public.record_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- record_share_invitations (token-based link sharing)
-- ============================================================
CREATE TABLE public.record_share_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type public.shareable_record_type NOT NULL,
  record_id uuid NOT NULL,
  role public.record_share_role NOT NULL,
  invite_token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rsi_record ON public.record_share_invitations (record_type, record_id);

ALTER TABLE public.record_share_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- record_change_proposals
-- ============================================================
CREATE TABLE public.record_change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type public.shareable_record_type NOT NULL,
  record_id uuid NOT NULL,
  proposed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type public.record_change_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.record_change_status NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcp_record ON public.record_change_proposals (record_type, record_id, status);
CREATE INDEX idx_rcp_proposer ON public.record_change_proposals (proposed_by);

ALTER TABLE public.record_change_proposals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper SECURITY DEFINER functions
-- ============================================================

-- Map record_type to its creator
CREATE OR REPLACE FUNCTION public.record_creator(_type public.shareable_record_type, _id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _type IN ('debate','change_my_mind') THEN (SELECT created_by FROM public.debates WHERE id = _id)
    WHEN _type = 'live_session' THEN (SELECT created_by FROM public.live_sessions WHERE id = _id)
    WHEN _type = 'notebook' THEN (SELECT user_id FROM public.session_notebooks WHERE id = _id)
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_record_co_owner(_type public.shareable_record_type, _id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.record_shares
    WHERE record_type = _type AND record_id = _id
      AND user_id = auth.uid()
      AND role = 'co_owner'
      AND accepted_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_record_viewer(_type public.shareable_record_type, _id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.record_shares
    WHERE record_type = _type AND record_id = _id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$;

-- Convenience: caller is creator
CREATE OR REPLACE FUNCTION public.is_record_creator(_type public.shareable_record_type, _id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND public.record_creator(_type, _id) = auth.uid();
$$;

-- ============================================================
-- Extend existing visibility helpers to honor record_shares
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_view_debate(_debate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = _debate_id
      AND (
        d.is_public = true
        OR d.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.debate_participants dp WHERE dp.debate_id = d.id AND dp.user_id = auth.uid())
        OR public.is_follower_of(d.created_by)
        OR public.is_record_viewer(
             CASE WHEN d.format = 'change_my_mind' THEN 'change_my_mind'::public.shareable_record_type
                  ELSE 'debate'::public.shareable_record_type END,
             d.id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_live_session(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = _session_id
      AND (
        s.is_public = true
        OR s.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.live_session_participants p WHERE p.session_id = s.id AND p.user_id = auth.uid())
        OR public.is_follower_of(s.created_by)
        OR public.is_record_viewer('live_session', s.id)
      )
  );
$$;

-- ============================================================
-- RLS policies for new tables
-- ============================================================

-- record_shares: creator or the shared user can SELECT; only creator can write
CREATE POLICY rs_select ON public.record_shares FOR SELECT
TO authenticated USING (
  user_id = auth.uid() OR public.is_record_creator(record_type, record_id)
);
CREATE POLICY rs_insert ON public.record_shares FOR INSERT
TO authenticated WITH CHECK (
  public.is_record_creator(record_type, record_id) AND invited_by = auth.uid()
);
CREATE POLICY rs_update ON public.record_shares FOR UPDATE
TO authenticated USING (
  user_id = auth.uid() OR public.is_record_creator(record_type, record_id)
);
CREATE POLICY rs_delete ON public.record_shares FOR DELETE
TO authenticated USING (
  user_id = auth.uid() OR public.is_record_creator(record_type, record_id)
);

-- record_share_invitations
CREATE POLICY rsi_select ON public.record_share_invitations FOR SELECT
TO authenticated USING (
  created_by = auth.uid() OR public.is_record_creator(record_type, record_id)
);
CREATE POLICY rsi_insert ON public.record_share_invitations FOR INSERT
TO authenticated WITH CHECK (
  created_by = auth.uid() AND public.is_record_creator(record_type, record_id)
);
CREATE POLICY rsi_update ON public.record_share_invitations FOR UPDATE
TO authenticated USING (
  created_by = auth.uid() OR public.is_record_creator(record_type, record_id)
);
CREATE POLICY rsi_delete ON public.record_share_invitations FOR DELETE
TO authenticated USING (
  public.is_record_creator(record_type, record_id)
);

-- record_change_proposals
CREATE POLICY rcp_select ON public.record_change_proposals FOR SELECT
TO authenticated USING (
  proposed_by = auth.uid() OR public.is_record_creator(record_type, record_id)
);
CREATE POLICY rcp_insert ON public.record_change_proposals FOR INSERT
TO authenticated WITH CHECK (
  proposed_by = auth.uid() AND public.is_record_co_owner(record_type, record_id)
);
CREATE POLICY rcp_update ON public.record_change_proposals FOR UPDATE
TO authenticated USING (
  (proposed_by = auth.uid() AND status = 'pending')
  OR public.is_record_creator(record_type, record_id)
);

-- ============================================================
-- Invitation acceptance + auto-fork on completed records
-- ============================================================

CREATE OR REPLACE FUNCTION public.fork_record_for_user(
  _type public.shareable_record_type, _id uuid, _user uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _new_id uuid;
BEGIN
  IF _type IN ('debate','change_my_mind') THEN
    INSERT INTO public.debates (
      created_by, topic, description, format, is_public, status,
      turns_per_subtopic, time_per_turn, prep_time_min, prep_time_max,
      max_speakers_per_side, facilitator_type, cover_image_url,
      topic_category, location, community_tag, institution_tag,
      forked_from_id, forked_at
    )
    SELECT _user, topic, description, format, false, 'draft'::debate_status,
           turns_per_subtopic, time_per_turn, prep_time_min, prep_time_max,
           max_speakers_per_side, facilitator_type, cover_image_url,
           topic_category, location, community_tag, institution_tag,
           id, now()
    FROM public.debates WHERE id = _id
    RETURNING id INTO _new_id;
  ELSIF _type = 'live_session' THEN
    INSERT INTO public.live_sessions (
      created_by, title, mode, status, transcript_entries, summaries,
      subtopics, speaker_names, is_public, cover_image_url, echo_guard,
      forked_from_id, forked_at
    )
    SELECT _user, COALESCE(title, '') || ' (fork)', mode, 'ended',
           transcript_entries, summaries, subtopics, speaker_names,
           false, cover_image_url, echo_guard, id, now()
    FROM public.live_sessions WHERE id = _id
    RETURNING id INTO _new_id;
  ELSIF _type = 'notebook' THEN
    INSERT INTO public.session_notebooks (
      user_id, record_type, record_id, display_title, thoughts, my_take,
      published, forked_from_id, forked_at
    )
    SELECT _user, record_type, record_id, COALESCE(display_title, '') || ' (fork)',
           thoughts, my_take, false, id, now()
    FROM public.session_notebooks WHERE id = _id
    RETURNING id INTO _new_id;
  END IF;
  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_is_completed(
  _type public.shareable_record_type, _id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _type IN ('debate','change_my_mind') THEN EXISTS (
      SELECT 1 FROM public.debates WHERE id = _id AND status IN ('completed'::debate_status, 'archived'::debate_status))
    WHEN _type = 'live_session' THEN EXISTS (
      SELECT 1 FROM public.live_sessions WHERE id = _id AND status IN ('ended','archived'))
    WHEN _type = 'notebook' THEN EXISTS (
      SELECT 1 FROM public.session_notebooks WHERE id = _id AND published = true)
  END;
$$;

CREATE OR REPLACE FUNCTION public.accept_share_invitation(_token text)
RETURNS TABLE(record_type public.shareable_record_type, record_id uuid, role public.record_share_role, fork_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _me uuid := auth.uid();
  _inv public.record_share_invitations%ROWTYPE;
  _hash text;
  _fork uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT * INTO _inv FROM public.record_share_invitations
   WHERE invite_token_hash = _hash AND revoked_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invitation not found or expired'; END IF;

  INSERT INTO public.record_shares (record_type, record_id, user_id, role, invited_by, accepted_at)
  VALUES (_inv.record_type, _inv.record_id, _me, _inv.role, _inv.created_by, now())
  ON CONFLICT (record_type, record_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, accepted_at = COALESCE(public.record_shares.accepted_at, now());

  UPDATE public.record_share_invitations
     SET claimed_by = _me, claimed_at = now()
   WHERE id = _inv.id AND claimed_by IS NULL;

  -- Fork immediately only if record already completed and role is co_owner
  IF _inv.role = 'co_owner' AND public.record_is_completed(_inv.record_type, _inv.record_id) THEN
    _fork := public.fork_record_for_user(_inv.record_type, _inv.record_id, _me);
  END IF;

  RETURN QUERY SELECT _inv.record_type, _inv.record_id, _inv.role, _fork;
END;
$$;

-- Create a sharing invitation (returns plaintext token to the creator)
CREATE OR REPLACE FUNCTION public.create_record_share_invitation(
  _type public.shareable_record_type, _id uuid, _role public.record_share_role
) RETURNS TABLE(id uuid, invite_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _token text;
  _hash text;
  _new_id uuid;
BEGIN
  IF NOT public.is_record_creator(_type, _id) THEN
    RAISE EXCEPTION 'Only the creator may create share invitations';
  END IF;
  _token := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  INSERT INTO public.record_share_invitations (record_type, record_id, role, invite_token_hash, created_by)
  VALUES (_type, _id, _role, _hash, auth.uid())
  RETURNING public.record_share_invitations.id INTO _new_id;
  RETURN QUERY SELECT _new_id, _token;
END;
$$;

-- Direct share to a known user (no link needed)
CREATE OR REPLACE FUNCTION public.share_record_with_user(
  _type public.shareable_record_type, _id uuid, _user_id uuid, _role public.record_share_role
) RETURNS public.record_shares
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.record_shares;
BEGIN
  IF NOT public.is_record_creator(_type, _id) THEN
    RAISE EXCEPTION 'Only the creator may share this record';
  END IF;
  INSERT INTO public.record_shares (record_type, record_id, user_id, role, invited_by, accepted_at)
  VALUES (_type, _id, _user_id, _role, auth.uid(), now())
  ON CONFLICT (record_type, record_id, user_id)
  DO UPDATE SET role = EXCLUDED.role
  RETURNING * INTO _row;

  -- Auto-fork if already completed + co-owner
  IF _role = 'co_owner' AND public.record_is_completed(_type, _id) THEN
    PERFORM public.fork_record_for_user(_type, _id, _user_id);
  END IF;
  RETURN _row;
END;
$$;

-- Proposal helpers
CREATE OR REPLACE FUNCTION public.propose_record_change(
  _type public.shareable_record_type, _id uuid,
  _change_type public.record_change_type, _payload jsonb
) RETURNS public.record_change_proposals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.record_change_proposals;
BEGIN
  IF NOT public.is_record_co_owner(_type, _id) THEN
    RAISE EXCEPTION 'Only co-owners may propose changes';
  END IF;
  INSERT INTO public.record_change_proposals (record_type, record_id, proposed_by, change_type, payload)
  VALUES (_type, _id, auth.uid(), _change_type, COALESCE(_payload, '{}'::jsonb))
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_record_change(
  _proposal_id uuid, _approve boolean, _reason text DEFAULT NULL
) RETURNS public.record_change_proposals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.record_change_proposals;
BEGIN
  SELECT * INTO _row FROM public.record_change_proposals WHERE id = _proposal_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Proposal not found'; END IF;
  IF NOT public.is_record_creator(_row.record_type, _row.record_id) THEN
    RAISE EXCEPTION 'Only the creator may decide proposals';
  END IF;
  IF _row.status <> 'pending' THEN RAISE EXCEPTION 'Proposal already decided'; END IF;

  UPDATE public.record_change_proposals
     SET status = CASE WHEN _approve THEN 'approved'::record_change_status ELSE 'rejected'::record_change_status END,
         decided_by = auth.uid(), decided_at = now(), decision_reason = _reason
   WHERE id = _proposal_id
   RETURNING * INTO _row;
  -- Note: payload application is handled client-side per change_type (kept simple in v1)
  RETURN _row;
END;
$$;

-- ============================================================
-- Trigger: auto-fork accepted co-owners when a record completes
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fork_on_debate_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rt public.shareable_record_type; _co RECORD;
BEGIN
  IF NEW.status IN ('completed'::debate_status,'archived'::debate_status)
     AND OLD.status NOT IN ('completed'::debate_status,'archived'::debate_status) THEN
    _rt := CASE WHEN NEW.format = 'change_my_mind' THEN 'change_my_mind'::public.shareable_record_type
                ELSE 'debate'::public.shareable_record_type END;
    FOR _co IN SELECT user_id FROM public.record_shares
               WHERE record_type = _rt AND record_id = NEW.id
                 AND role = 'co_owner' AND accepted_at IS NOT NULL
    LOOP
      PERFORM public.fork_record_for_user(_rt, NEW.id, _co.user_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER debates_fork_on_complete AFTER UPDATE OF status ON public.debates
FOR EACH ROW EXECUTE FUNCTION public.trg_fork_on_debate_complete();

CREATE OR REPLACE FUNCTION public.trg_fork_on_live_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _co RECORD;
BEGIN
  IF NEW.status IN ('ended','archived') AND OLD.status NOT IN ('ended','archived') THEN
    FOR _co IN SELECT user_id FROM public.record_shares
               WHERE record_type = 'live_session' AND record_id = NEW.id
                 AND role = 'co_owner' AND accepted_at IS NOT NULL
    LOOP
      PERFORM public.fork_record_for_user('live_session', NEW.id, _co.user_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER live_sessions_fork_on_complete AFTER UPDATE OF status ON public.live_sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_fork_on_live_complete();

CREATE OR REPLACE FUNCTION public.trg_fork_on_notebook_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _co RECORD;
BEGIN
  IF NEW.published = true AND OLD.published = false THEN
    FOR _co IN SELECT user_id FROM public.record_shares
               WHERE record_type = 'notebook' AND record_id = NEW.id
                 AND role = 'co_owner' AND accepted_at IS NOT NULL
    LOOP
      PERFORM public.fork_record_for_user('notebook', NEW.id, _co.user_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notebooks_fork_on_publish AFTER UPDATE OF published ON public.session_notebooks
FOR EACH ROW EXECUTE FUNCTION public.trg_fork_on_notebook_publish();