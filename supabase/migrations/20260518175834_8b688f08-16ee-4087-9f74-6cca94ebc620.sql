
DROP FUNCTION IF EXISTS public.evict_live_participant(uuid, text);

CREATE OR REPLACE FUNCTION public.evict_live_participant(_session_id uuid, _device_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_live_session_host(_session_id) THEN
    RAISE EXCEPTION 'Only the host can evict participants';
  END IF;
  DELETE FROM public.live_session_participants
   WHERE session_id = _session_id AND device_id = _device_id;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.evict_live_participant(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_user_not_silenced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := COALESCE(NEW.sender_id, NEW.user_id);
  IF _uid IS NOT NULL AND public.is_user_silenced(_uid) THEN
    RAISE EXCEPTION 'Your account is currently muted or suspended and cannot post.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dm_messages_silenced ON public.dm_messages;
CREATE TRIGGER trg_dm_messages_silenced
  BEFORE INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_not_silenced();

DROP TRIGGER IF EXISTS trg_record_comments_silenced ON public.record_comments;
CREATE TRIGGER trg_record_comments_silenced
  BEFORE INSERT ON public.record_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_not_silenced();

DROP TRIGGER IF EXISTS trg_notebook_reader_notes_silenced ON public.notebook_reader_notes;
CREATE TRIGGER trg_notebook_reader_notes_silenced
  BEFORE INSERT ON public.notebook_reader_notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_not_silenced();
