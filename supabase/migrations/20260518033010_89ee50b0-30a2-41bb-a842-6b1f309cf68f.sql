
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  position serial,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  invited_at timestamptz,
  source text NOT NULL DEFAULT 'organic',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
ON public.waitlist FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins manage waitlist"
ON public.waitlist FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_credits int NOT NULL DEFAULT 3;

INSERT INTO storage.buckets (id, name, public)
VALUES ('og-images', 'og-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read og-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'og-images');
