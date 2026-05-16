
-- Friend code generator: DYNM-XXXX-XXXX using crockford-ish base32 (no I/O/L/U)
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
  result text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := 'DYNM-';
    FOR i IN 1..4 LOOP
      result := result || substr(alphabet, 1 + (floor(random() * length(alphabet)))::int, 1);
    END LOOP;
    result := result || '-';
    FOR i IN 1..4 LOOP
      result := result || substr(alphabet, 1 + (floor(random() * length(alphabet)))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = result);
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique friend code after 50 attempts';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS friend_code text;

-- Backfill existing rows
UPDATE public.profiles
SET friend_code = public.generate_friend_code()
WHERE friend_code IS NULL;

-- Enforce uniqueness + not-null going forward
ALTER TABLE public.profiles
  ALTER COLUMN friend_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_code_key
  ON public.profiles (friend_code);

-- Trigger to auto-fill on insert if missing
CREATE OR REPLACE FUNCTION public.fill_friend_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.friend_code IS NULL THEN
    NEW.friend_code := public.generate_friend_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_friend_code ON public.profiles;
CREATE TRIGGER trg_fill_friend_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_friend_code();

-- Update handle_new_user to populate friend_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_public, friend_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true,
    public.generate_friend_code()
  );
  RETURN NEW;
END;
$$;
