import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Loader2, Mic, MicOff, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import MicTestStep from "@/components/join/MicTestStep";
import WaitingForHost from "@/components/lobby/WaitingForHost";
import { useMicLobbyAttachment } from "@/hooks/useMicLobbyAttachment";
import { setHandoffStream } from "@/lib/micHandoff";

const getDeviceId = () => {
  let id = localStorage.getItem("dyn_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dyn_device_id", id);
  }
  return id;
};

type Phase = "loading" | "pick" | "mic" | "waiting" | "live" | "error";

/**
 * In-person CMM challenger join flow: validate code -> pick own_mic vs room
 * mic -> attach mic_connections row -> wait for host to call you up.
 */
export default function JoinCmmPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deviceId = useMemo(getDeviceId, []);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [debateId, setDebateId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"own_mic" | "voice_detect_only">("own_mic");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (authLoading || !code) return;
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("debates")
        .select("id, topic, status, format")
        .eq("join_code", code.toUpperCase())
        .maybeSingle();
      if (error || !data || data.format !== "change_my_mind") {
        setError("Invalid join code.");
        setPhase("error");
        return;
      }
      setDebateId(data.id);
      setTopic(data.topic);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setDisplayName(prof?.display_name || user.email?.split("@")[0] || "Challenger");
      setPhase("pick");
    })();
  }, [code, user, authLoading]);

  const slotKey = user?.id ? `queue:${user.id}` : null;

  useMicLobbyAttachment({
    kind: "cmm",
    sessionId: phase === "waiting" || phase === "live" ? debateId : null,
    slotKey,
    userId: user?.id ?? null,
    deviceId,
    displayName,
    mode,
    stream: mode === "own_mic" ? stream : null,
  });

  // Once host flips status to 'live', enroll in queue and navigate to room.
  useEffect(() => {
    if (phase !== "waiting" || !debateId) return;
    const channel = supabase
      .channel(`cmm-lobby-watch-${debateId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "debates", filter: `id=eq.${debateId}` },
        (payload) => {
          if ((payload.new as any).status === "live") {
            if (stream) setHandoffStream(stream);
            navigate(`/cmm/${debateId}`, { replace: true });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [phase, debateId, navigate, stream]);

  const goWaiting = useCallback(() => setPhase("waiting"), []);

  if (authLoading || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    const returnPath = `${location.pathname}${location.search}`;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl mb-2">Sign in to join</h1>
        <Link
          to={`/auth?redirect=${encodeURIComponent(returnPath)}`}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
        >
          Continue
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <MicOff className="w-6 h-6 text-destructive mb-3" />
        <h1 className="font-display text-xl mb-2">Couldn't join</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{error}</p>
        <Link to="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">Go home</Link>
      </div>
    );
  }

  if (phase === "pick") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-5">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Join Change My Mind</p>
            <h1 className="font-display text-2xl text-foreground mt-1">{topic}</h1>
          </div>
          <button
            onClick={() => { setMode("own_mic"); setPhase("mic"); }}
            className="w-full p-4 border border-border rounded-lg text-left hover:border-foreground/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-4 h-4" />
              <span className="font-display text-sm">Use my own mic</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-body">Best quality. Recommended.</p>
          </button>
          <button
            onClick={() => { setMode("voice_detect_only"); goWaiting(); }}
            className="w-full p-4 border border-border rounded-lg text-left hover:border-foreground/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <MicOff className="w-4 h-4" />
              <span className="font-display text-sm">Use the room mic</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-body">Voice-detection only.</p>
          </button>
        </div>
      </div>
    );
  }

  if (phase === "mic") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <h1 className="font-display text-xl text-center mb-4">Test your mic</h1>
          <MicTestStep
            continueLabel="Connect mic"
            onReady={(s) => {
              setStream(s);
              goWaiting();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <WaitingForHost
          sessionTitle={topic}
          stream={stream}
          mode={mode}
          onLeave={() => {
            stream?.getTracks().forEach((t) => t.stop());
            navigate("/");
          }}
        />
      </div>
    </div>
  );
}