
REVOKE EXECUTE ON FUNCTION public.pause_speaker_pause(uuid, int, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resume_speaker_pause(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pause_debate(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resume_debate(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.promote_lobby_to_participants(uuid) FROM PUBLIC, anon;
