-- Add description column to debates
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS description text;

-- Coordination thread per interest row
CREATE TABLE IF NOT EXISTS public.debate_interest_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid NOT NULL REFERENCES public.debate_interests(id) ON DELETE CASCADE,
  debate_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debate_interest_messages_interest ON public.debate_interest_messages(interest_id, created_at);

ALTER TABLE public.debate_interest_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a party to this interest (requester OR debate creator)?
CREATE OR REPLACE FUNCTION public.is_interest_party(_interest_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.debate_interests di
    JOIN public.debates d ON d.id = di.debate_id
    WHERE di.id = _interest_id
      AND (di.user_id = auth.uid() OR d.created_by = auth.uid())
  );
$$;

CREATE POLICY "Parties can view interest messages"
ON public.debate_interest_messages FOR SELECT TO authenticated
USING (public.is_interest_party(interest_id));

CREATE POLICY "Parties can send interest messages"
ON public.debate_interest_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_interest_party(interest_id));

CREATE POLICY "Senders can delete own messages"
ON public.debate_interest_messages FOR DELETE TO authenticated
USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_interest_messages;