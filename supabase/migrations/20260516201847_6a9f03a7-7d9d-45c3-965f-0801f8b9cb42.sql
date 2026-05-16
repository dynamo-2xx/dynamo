
REVOKE ALL ON FUNCTION public.anonymize_expired_accounts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_account_deletion() FROM anon;
REVOKE ALL ON FUNCTION public.cancel_account_deletion() FROM anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;
