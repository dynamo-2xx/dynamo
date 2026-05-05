import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import MicLobby from "@/components/lobby/MicLobby";
import EchoGuardToggle from "@/components/lobby/EchoGuardToggle";
import { toast } from "sonner";

/**
 * Owner pre-recording lobby for a Live session in multi_device mode.
 * Connected joiners write their mic_connections row from /live/join/:code.
 * Hitting Start flips status to 'recording' and navigates to /live/:id.
 */
export default function LiveLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [echoGuard, setEchoGuard] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("live_sessions")
        .select("title, join_code, echo_guard, created_by, status, mode")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        toast.error("Session not found");
        navigate("/");
        return;
      }
      if (user && data.created_by !== user.id) {
        navigate(`/live/${id}`, { replace: true });
        return;
      }
      if (data.status === "recording") {
        navigate(`/live/${id}`, { replace: true });
        return;
      }
      setTitle(data.title || "Live session");
      setJoinCode(data.join_code);
      setEchoGuard(!!data.echo_guard);
    })();
  }, [id, user, navigate]);

  const updateEcho = async (v: boolean) => {
    setEchoGuard(v);
    if (id) await (supabase as any).from("live_sessions").update({ echo_guard: v }).eq("id", id);
  };

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    const { error } = await (supabase as any)
      .from("live_sessions")
      .update({ status: "recording" })
      .eq("id", id);
    setStarting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(`/live/${id}`, { replace: true });
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Lobby</p>
          <h1 className="font-display text-2xl text-foreground">{title}</h1>
        </div>
        {joinCode && (
          <div className="p-4 border border-border rounded-lg bg-background">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Join code</p>
            <p className="font-mono text-2xl tracking-widest text-foreground mt-1">{joinCode}</p>
            <p className="text-[11px] text-muted-foreground mt-2 font-body">
              Joiners go to <span className="font-mono">/live/join/{joinCode}</span>
            </p>
          </div>
        )}
        <EchoGuardToggle value={echoGuard} onChange={updateEcho} />
        <MicLobby
          kind="live"
          sessionId={id ?? null}
          slots={[]}
          minConnected={0}
          onStart={handleStart}
          starting={starting}
          startLabel="Start recording"
        />
      </div>
    </AppLayout>
  );
}