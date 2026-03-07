import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const JoinDebatePage = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Joining debate…");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to auth, then come back
      navigate(`/auth?redirect=/join/${code}`, { replace: true });
      return;
    }

    const joinDebate = async () => {
      // Find debate by join_code
      const { data: debate, error } = await supabase
        .from("debates")
        .select("id")
        .eq("join_code", code?.toUpperCase())
        .single();

      if (error || !debate) {
        setStatus("Invalid join code.");
        toast.error("Debate not found with this code.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      // Check if already a participant
      const { data: existing } = await supabase
        .from("debate_participants")
        .select("id")
        .eq("debate_id", debate.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        // Add as speaker
        const { error: joinError } = await supabase
          .from("debate_participants")
          .insert({
            debate_id: debate.id,
            user_id: user.id,
            participant_role: "speaker",
          });

        if (joinError) {
          toast.error("Failed to join debate.");
          navigate("/");
          return;
        }
      }

      toast.success("Joined debate!");
      navigate(`/debate/${debate.id}`, { replace: true });
    };

    joinDebate();
  }, [code, user, authLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
};

export default JoinDebatePage;
