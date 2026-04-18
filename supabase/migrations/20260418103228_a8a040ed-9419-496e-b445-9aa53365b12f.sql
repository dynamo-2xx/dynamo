-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  actor_id UUID,
  debate_id UUID,
  interest_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view their notifications"
ON public.notifications FOR SELECT TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "Authenticated can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Recipients can update read state"
ON public.notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Recipients can delete their notifications"
ON public.notifications FOR DELETE TO authenticated
USING (recipient_id = auth.uid());

-- Debate interests table
CREATE TABLE public.debate_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'spectator', -- 'speaker' | 'spectator'
  side_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'time_proposed' | 'confirmed' | 'declined' | 'cancelled'
  proposed_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (debate_id, user_id, role, side_id)
);

CREATE INDEX idx_debate_interests_debate ON public.debate_interests(debate_id);
CREATE INDEX idx_debate_interests_user ON public.debate_interests(user_id);

ALTER TABLE public.debate_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View interests for accessible debates"
ON public.debate_interests FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_view_debate(debate_id)
);

CREATE POLICY "Users can express interest on visible debates"
ON public.debate_interests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.can_view_debate(debate_id)
);

CREATE POLICY "Users can cancel own interest, creator can update"
ON public.debate_interests FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.debates d WHERE d.id = debate_id AND d.created_by = auth.uid())
);

CREATE POLICY "Users can delete own interest"
ON public.debate_interests FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_debate_interests_updated_at
BEFORE UPDATE ON public.debate_interests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();