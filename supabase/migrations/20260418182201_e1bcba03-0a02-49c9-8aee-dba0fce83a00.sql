
-- dm_threads: one row per (user_a, user_b [, debate_id]) pair, sorted
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  debate_id uuid NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_threads_sorted CHECK (user_a < user_b)
);

CREATE UNIQUE INDEX dm_threads_unique_pair_debate
  ON public.dm_threads (user_a, user_b, COALESCE(debate_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX dm_threads_user_a_idx ON public.dm_threads(user_a, last_message_at DESC);
CREATE INDEX dm_threads_user_b_idx ON public.dm_threads(user_b, last_message_at DESC);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their threads"
  ON public.dm_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Inserts go through the RPC (security definer); no direct insert policy needed,
-- but allow participants to insert defensively for client-side fallbacks.
CREATE POLICY "Participants can insert threads"
  ON public.dm_threads FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_a OR auth.uid() = user_b) AND user_a < user_b);

CREATE POLICY "Participants can update last_message_at"
  ON public.dm_threads FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- dm_messages
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dm_messages_thread_idx ON public.dm_messages(thread_id, created_at);
CREATE INDEX dm_messages_unread_idx ON public.dm_messages(thread_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_dm_thread_party(_thread_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = _thread_id
      AND (t.user_a = auth.uid() OR t.user_b = auth.uid())
  );
$$;

CREATE POLICY "Parties can view dm messages"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (public.is_dm_thread_party(thread_id));

CREATE POLICY "Parties can send dm messages"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_dm_thread_party(thread_id));

CREATE POLICY "Recipients can mark messages read"
  ON public.dm_messages FOR UPDATE TO authenticated
  USING (public.is_dm_thread_party(thread_id) AND sender_id <> auth.uid())
  WITH CHECK (public.is_dm_thread_party(thread_id) AND sender_id <> auth.uid());

-- Trigger: bump dm_threads.last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_dm_thread_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.dm_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_dm_thread_last_message
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_dm_thread_last_message();

-- RPC: get-or-create thread
CREATE OR REPLACE FUNCTION public.get_or_create_dm_thread(_other_user uuid, _debate_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_user = _me THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;

  IF _me < _other_user THEN _a := _me; _b := _other_user;
  ELSE _a := _other_user; _b := _me; END IF;

  SELECT id INTO _id FROM public.dm_threads
   WHERE user_a = _a AND user_b = _b
     AND COALESCE(debate_id, '00000000-0000-0000-0000-000000000000'::uuid) =
         COALESCE(_debate_id, '00000000-0000-0000-0000-000000000000'::uuid)
   LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.dm_threads (user_a, user_b, debate_id)
    VALUES (_a, _b, _debate_id) RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER TABLE public.dm_threads REPLICA IDENTITY FULL;
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
