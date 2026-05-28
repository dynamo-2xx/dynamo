ALTER TABLE public.debate_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.debate_interests REPLICA IDENTITY FULL;
ALTER TABLE public.debate_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_invitations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_interests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_participants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;