import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import MicLobby from "@/components/lobby/MicLobby";
import { toast } from "sonner";

/**
 * Owner pre-live lobby for a Change My Mind session. Owner connects their
 * own mic, optional in-person challengers can attach via /cmm/join/:code.
 * Start flips status to 'live' and routes to the room.
 */
export default function CmmLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("debates")
        .select("topic, join_code, created_by, status, format")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        toast.error("Session not found");
        navigate("/");
        return;
      }
      if (user && data.created_by !== user.id) {
        navigate(`/cmm/${id}`, { replace: true });
        return;
      }
      if (data.status === "live") {
        navigate(`/cmm/${id}`, { replace: true });
        return;
      }
      setTopic(data.topic);
      setJoinCode(data.join_code);
    })();
  }, [id, user, navigate]);

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    const { error } = await supabase
      .from("debates")
      .update({ status: "live", started_at: new Date().toISOString() })
      .eq("id", id);
    setStarting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(`/cmm/${id}`, { replace: true });
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Lobby</p>
          <h1 className="font-display text-2xl text-foreground">{topic}</h1>
        </div>
        {joinCode && (
          <div className="p-4 border border-border rounded-lg bg-background">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Join code</p>
            <p className="font-mono text-2xl tracking-widest text-foreground mt-1">{joinCode}</p>
            <p className="text-[11px] text-muted-foreground mt-2 font-body">
              Challengers go to <span className="font-mono">/cmm/join/{joinCode}</span>
            </p>
          </div>
        )}
        <MicLobby
          kind="cmm"
          sessionId={id ?? null}
          slots={[{ key: `host:${user?.id ?? ""}`, label: "Host", hint: "You — connect your mic" }]}
          minConnected={0}
          onStart={handleStart}
          starting={starting}
          startLabel="Start round"
        />
      </div>
    </AppLayout>
  );
}