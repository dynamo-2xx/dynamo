REVOKE ALL ON FUNCTION public.enforce_two_debate_sides() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_two_debate_sides() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_two_debate_sides() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_two_debate_sides() TO service_role;