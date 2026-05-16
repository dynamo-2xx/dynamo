
-- Singleton founder settings
CREATE TABLE public.founder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_ai_usd numeric NOT NULL DEFAULT 100,
  budget_speech_usd numeric NOT NULL DEFAULT 60,
  budget_cloud_usd numeric NOT NULL DEFAULT 30,
  budget_stripe_usd numeric NOT NULL DEFAULT 10,
  monthly_revenue_goal_usd numeric,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read founder settings"
  ON public.founder_settings FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update founder settings"
  ON public.founder_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert founder settings"
  ON public.founder_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed the singleton row
INSERT INTO public.founder_settings (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;

CREATE TRIGGER founder_settings_updated_at
  BEFORE UPDATE ON public.founder_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI usage ledger
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  function_name text NOT NULL,
  model text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_log_user_created_idx ON public.ai_usage_log(user_id, created_at DESC);
CREATE INDEX ai_usage_log_created_idx ON public.ai_usage_log(created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ai usage"
  ON public.ai_usage_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Speech usage ledger
CREATE TABLE public.speech_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  minutes numeric NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX speech_usage_log_user_created_idx ON public.speech_usage_log(user_id, created_at DESC);
CREATE INDEX speech_usage_log_created_idx ON public.speech_usage_log(created_at DESC);

ALTER TABLE public.speech_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read speech usage"
  ON public.speech_usage_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Daily rollup
CREATE TABLE public.daily_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  source text NOT NULL CHECK (source IN ('ai','speech','cloud','stripe')),
  cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, source)
);

CREATE INDEX daily_costs_date_idx ON public.daily_costs(date DESC);

ALTER TABLE public.daily_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read daily costs"
  ON public.daily_costs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Alert dedupe log
CREATE TABLE public.cost_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  source text,
  threshold numeric,
  period_key text NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_type, source, threshold, period_key)
);

ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read cost alerts"
  ON public.cost_alerts FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
