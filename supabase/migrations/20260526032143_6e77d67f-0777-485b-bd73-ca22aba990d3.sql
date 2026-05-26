
-- Primary tag on clubs
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS primary_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_club_tags_tag ON public.club_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_clubs_primary_tag ON public.clubs(primary_tag_id);

-- Validate primary_tag_id refers to an attached club_tag
CREATE OR REPLACE FUNCTION public.validate_club_primary_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.primary_tag_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.club_tags ct
    WHERE ct.club_id = NEW.id AND ct.tag_id = NEW.primary_tag_id
  ) THEN
    RAISE EXCEPTION 'primary_tag_id must reference a tag attached to this club';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clubs_validate_primary_tag ON public.clubs;
CREATE TRIGGER trg_clubs_validate_primary_tag
  BEFORE UPDATE OF primary_tag_id ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.validate_club_primary_tag();

-- Clear primary_tag_id when the corresponding club_tag is removed
CREATE OR REPLACE FUNCTION public.clear_club_primary_tag_on_detach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clubs
    SET primary_tag_id = NULL
    WHERE id = OLD.club_id AND primary_tag_id = OLD.tag_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_club_tags_clear_primary ON public.club_tags;
CREATE TRIGGER trg_club_tags_clear_primary
  AFTER DELETE ON public.club_tags
  FOR EACH ROW EXECUTE FUNCTION public.clear_club_primary_tag_on_detach();
