WITH ranked AS (
  SELECT
    id,
    debate_id,
    label,
    sort_order,
    row_number() OVER (PARTITION BY debate_id ORDER BY sort_order, created_at, id) AS rn
  FROM public.debate_sides
), keepers AS (
  SELECT id, debate_id, label, rn
  FROM ranked
  WHERE rn <= 2
), extras AS (
  SELECT r.id, r.debate_id, r.label, r.rn
  FROM ranked r
  WHERE r.rn > 2
), remap AS (
  SELECT
    e.id AS old_side_id,
    COALESCE(
      same_label.id,
      same_parity.id,
      first_keeper.id
    ) AS new_side_id
  FROM extras e
  LEFT JOIN LATERAL (
    SELECT k.id
    FROM keepers k
    WHERE k.debate_id = e.debate_id
      AND lower(trim(k.label)) = lower(trim(e.label))
    ORDER BY k.rn
    LIMIT 1
  ) same_label ON true
  LEFT JOIN LATERAL (
    SELECT k.id
    FROM keepers k
    WHERE k.debate_id = e.debate_id
      AND k.rn = CASE WHEN ((e.rn - 1) % 2) = 0 THEN 1 ELSE 2 END
    LIMIT 1
  ) same_parity ON true
  LEFT JOIN LATERAL (
    SELECT k.id
    FROM keepers k
    WHERE k.debate_id = e.debate_id
    ORDER BY k.rn
    LIMIT 1
  ) first_keeper ON true
)
UPDATE public.debate_participants p
SET side_id = remap.new_side_id
FROM remap
WHERE p.side_id = remap.old_side_id
  AND remap.new_side_id IS NOT NULL;

WITH ranked AS (
  SELECT
    id,
    debate_id,
    label,
    sort_order,
    row_number() OVER (PARTITION BY debate_id ORDER BY sort_order, created_at, id) AS rn
  FROM public.debate_sides
), keepers AS (
  SELECT id, debate_id, label, rn
  FROM ranked
  WHERE rn <= 2
), extras AS (
  SELECT r.id, r.debate_id, r.label, r.rn
  FROM ranked r
  WHERE r.rn > 2
), remap AS (
  SELECT
    e.id AS old_side_id,
    COALESCE(same_label.id, same_parity.id, first_keeper.id) AS new_side_id
  FROM extras e
  LEFT JOIN LATERAL (
    SELECT k.id FROM keepers k
    WHERE k.debate_id = e.debate_id AND lower(trim(k.label)) = lower(trim(e.label))
    ORDER BY k.rn LIMIT 1
  ) same_label ON true
  LEFT JOIN LATERAL (
    SELECT k.id FROM keepers k
    WHERE k.debate_id = e.debate_id AND k.rn = CASE WHEN ((e.rn - 1) % 2) = 0 THEN 1 ELSE 2 END
    LIMIT 1
  ) same_parity ON true
  LEFT JOIN LATERAL (
    SELECT k.id FROM keepers k WHERE k.debate_id = e.debate_id ORDER BY k.rn LIMIT 1
  ) first_keeper ON true
)
UPDATE public.debate_invitations i
SET side_id = remap.new_side_id
FROM remap
WHERE i.side_id = remap.old_side_id
  AND remap.new_side_id IS NOT NULL;

WITH ranked AS (
  SELECT
    id,
    debate_id,
    label,
    sort_order,
    row_number() OVER (PARTITION BY debate_id ORDER BY sort_order, created_at, id) AS rn
  FROM public.debate_sides
), keepers AS (
  SELECT id, debate_id, label, rn
  FROM ranked
  WHERE rn <= 2
), extras AS (
  SELECT r.id, r.debate_id, r.label, r.rn
  FROM ranked r
  WHERE r.rn > 2
), remap AS (
  SELECT
    e.id AS old_side_id,
    COALESCE(same_label.id, same_parity.id, first_keeper.id) AS new_side_id
  FROM extras e
  LEFT JOIN LATERAL (
    SELECT k.id FROM keepers k
    WHERE k.debate_id = e.debate_id AND lower(trim(k.label)) = lower(trim(e.label))
    ORDER BY k.rn LIMIT 1
  ) same_label ON true
  LEFT JOIN LATERAL (
    SELECT k.id FROM keepers k
    WHERE k.debate_id = e.debate_id AND k.rn = CASE WHEN ((e.rn - 1) % 2) = 0 THEN 1 ELSE 2 END
    LIMIT 1
  ) same_parity ON true
  LEFT JOIN LATERAL (
    SELECT k.id FROM keepers k WHERE k.debate_id = e.debate_id ORDER BY k.rn LIMIT 1
  ) first_keeper ON true
)
UPDATE public.debate_interests di
SET side_id = remap.new_side_id
FROM remap
WHERE di.side_id = remap.old_side_id
  AND remap.new_side_id IS NOT NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY debate_id ORDER BY sort_order, created_at, id) AS rn
  FROM public.debate_sides
)
DELETE FROM public.debate_sides ds
USING ranked r
WHERE ds.id = r.id
  AND r.rn > 2;

UPDATE public.debate_sides ds
SET sort_order = normalized.next_sort_order
FROM (
  SELECT id, row_number() OVER (PARTITION BY debate_id ORDER BY sort_order, created_at, id) - 1 AS next_sort_order
  FROM public.debate_sides
) normalized
WHERE ds.id = normalized.id;

CREATE UNIQUE INDEX IF NOT EXISTS debate_sides_debate_sort_order_unique
ON public.debate_sides (debate_id, sort_order);

CREATE OR REPLACE FUNCTION public.enforce_two_debate_sides()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
BEGIN
  SELECT count(*) INTO existing_count
  FROM public.debate_sides
  WHERE debate_id = NEW.debate_id
    AND id IS DISTINCT FROM NEW.id;

  IF TG_OP = 'INSERT' AND existing_count >= 2 THEN
    RAISE EXCEPTION 'A debate can have only two participant sides';
  END IF;

  IF TG_OP = 'UPDATE' AND existing_count >= 2 AND NEW.sort_order > 1 THEN
    RAISE EXCEPTION 'A debate can have only two participant sides';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_two_debate_sides_before_write ON public.debate_sides;
CREATE TRIGGER enforce_two_debate_sides_before_write
BEFORE INSERT OR UPDATE ON public.debate_sides
FOR EACH ROW
EXECUTE FUNCTION public.enforce_two_debate_sides();