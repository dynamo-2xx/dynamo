-- 1. Notify intents per debate
CREATE TABLE public.debate_notify_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (debate_id, user_id)
);

CREATE INDEX idx_debate_notify_subs_debate ON public.debate_notify_subscriptions(debate_id);
CREATE INDEX idx_debate_notify_subs_user ON public.debate_notify_subscriptions(user_id);

ALTER TABLE public.debate_notify_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notify intents"
ON public.debate_notify_subscriptions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can add notify intent on visible debates"
ON public.debate_notify_subscriptions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_view_debate(debate_id));

CREATE POLICY "Users can remove their own notify intent"
ON public.debate_notify_subscriptions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 2. Browser push subscriptions per device
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
ON public.push_subscriptions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can add their own push subscription"
ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push subscription"
ON public.push_subscriptions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscription"
ON public.push_subscriptions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 3. Make sure pg_net is enabled so we can call the dispatch edge function from a trigger
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Trigger: when a debate flips to 'live', call the dispatch edge function
CREATE OR REPLACE FUNCTION public.notify_debate_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_url text := 'https://jizhbglplkymmjgxnkts.supabase.co';
BEGIN
  IF NEW.status = 'live' AND (OLD.status IS DISTINCT FROM 'live') THEN
    PERFORM net.http_post(
      url := _project_url || '/functions/v1/dispatch-debate-start-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('debate_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_debate_started ON public.debates;
CREATE TRIGGER trg_notify_debate_started
AFTER UPDATE OF status ON public.debates
FOR EACH ROW
EXECUTE FUNCTION public.notify_debate_started();