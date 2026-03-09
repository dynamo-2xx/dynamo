
-- Attach the join_code trigger to the debates table
CREATE TRIGGER generate_join_code_trigger
  BEFORE INSERT ON public.debates
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_join_code();
