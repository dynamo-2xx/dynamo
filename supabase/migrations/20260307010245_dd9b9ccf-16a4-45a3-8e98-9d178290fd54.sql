
-- 1. Add participant_role column to debate_participants
ALTER TABLE public.debate_participants 
  ADD COLUMN IF NOT EXISTS participant_role text NOT NULL DEFAULT 'speaker';

-- 2. Fix the broken debates UPDATE policy (dp.debate_id = dp.id should be dp.debate_id = debates.id)
DROP POLICY IF EXISTS "Creator or participant can update debates" ON public.debates;
CREATE POLICY "Creator or participant can update debates"
  ON public.debates FOR UPDATE TO authenticated
  USING (
    (auth.uid() = created_by) OR 
    (EXISTS (
      SELECT 1 FROM public.debate_participants dp
      WHERE dp.debate_id = debates.id AND dp.user_id = auth.uid()
    ))
  );

-- 3. Generate join codes for new debates automatically
CREATE OR REPLACE FUNCTION public.generate_join_code()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_join_code ON public.debates;
CREATE TRIGGER set_join_code
  BEFORE INSERT ON public.debates
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_join_code();
