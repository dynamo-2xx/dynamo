CREATE TABLE public.record_qa_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_record_qa_messages_lookup
  ON public.record_qa_messages (user_id, record_type, record_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_qa_messages TO authenticated;
GRANT ALL ON public.record_qa_messages TO service_role;

ALTER TABLE public.record_qa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own qa messages"
  ON public.record_qa_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own qa messages"
  ON public.record_qa_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own qa messages"
  ON public.record_qa_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.record_qa_messages;