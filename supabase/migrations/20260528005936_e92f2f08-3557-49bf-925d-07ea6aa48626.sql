
CREATE TABLE IF NOT EXISTS public.launch_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  is_public_launched boolean NOT NULL DEFAULT false,
  launched_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.launch_config TO anon, authenticated;
GRANT UPDATE ON public.launch_config TO authenticated;
GRANT ALL ON public.launch_config TO service_role;

ALTER TABLE public.launch_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read launch flag"
  ON public.launch_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update launch flag"
  ON public.launch_config FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed the single row.
INSERT INTO public.launch_config (id, is_public_launched)
  VALUES (true, false)
  ON CONFLICT (id) DO NOTHING;
