CREATE OR REPLACE FUNCTION public.realtime_topic_debate_id(_topic text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _topic ~ '^(debate|transcript|grades|audience|projector)-[0-9a-fA-F-]{36}$'
      THEN (regexp_replace(_topic, '^(debate|transcript|grades|audience|projector)-', ''))::uuid
    ELSE NULL
  END;
$$;
