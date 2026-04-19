import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceTranscription } from "@/hooks/useDeviceTranscription";
import { useLiveSessionRTC } from "@/hooks/useLiveSessionRTC";
import VideoGrid from "@/components/live/VideoGrid";
import { toast } from "sonner";

const AVATAR_EMOJIS = ["🦊", "🐼", "🐙", "🦉", "🐝", "🦄", "🐯", "🐳", "🦁", "🐧", "🐢", "🐬"];

const getDeviceId = () => {
  let id = localStorage.getItem("dyn_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dyn_device_id", id);
  }
  return id;
};

type Phase = "loading" | "setup" | "recording" | "error";

const LiveJoinPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const deviceId = useMemo(() => getDeviceId(), []);

  const [phase, setPhase] = useState<Phase>("setup");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState(AVATAR_EMOJIS[0]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [speakerSlot, setSpeakerSlot] = useState<number>(0);
  const [sessionTitle, setSessionTitle] = useState<string>("");

  // Prefill name from profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name);
    })();
  }, [user]);

  const handleJoin = useCallback(async () => {
    if (!code) return;
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    setPhase("loading");
    try {
      const { data, error } = await (supabase as any).rpc("join_live_session", {
        _code: code,
        _device_id: deviceId,
        _display_name: displayName.trim(),
        _avatar_url: emoji,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.session_id) throw new Error("Could not join session");
      setSessionId(row.session_id);
      setSpeakerSlot(row.speaker_slot);
      setSessionTitle(row.title || "Live Session");
      setPhase("recording");

      // Wake lock (best-effort)
      try {
        // @ts-ignore
        await navigator.wakeLock?.request("screen");
      } catch {}
    } catch (e: any) {
      console.error("join error", e);
      setErrorMsg(e?.message || "Could not join. The code may be invalid or the session ended.");
      setPhase("error");
    }
  }, [code, deviceId, displayName, emoji]);

  // ── Recording phase ──
  const isRecording = phase === "recording";
  const rtc = useLiveSessionRTC({
    sessionId,
    deviceId,
    displayName,
    isActive: isRecording,
  });
  const { interimText, isConnected, error: micError } = useDeviceTranscription({
    sessionId,
    deviceId,
    speakerSlot,
    speakerName: displayName,
    isActive: isRecording,
    isMicEnabled: rtc.micOn,
  });

  // Heartbeat
  useEffect(() => {
    if (!isRecording || !sessionId) return;
    const beat = () => {
      (supabase as any).rpc("live_session_heartbeat", {
        _session_id: sessionId,
        _device_id: deviceId,
      });
    };
    beat();
    const t = setInterval(beat, 15000);
    return () => clearInterval(t);
  }, [isRecording, sessionId, deviceId]);

  // Auth gate — joining requires an account so the device can call deepgram-token
  // and so the participant has a stable identity.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    const returnPath = `${location.pathname}${location.search}`;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Sign in to join</h1>
          <p className="text-sm text-muted-foreground mb-2">
            You need an account to join this live session.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Joining code{" "}
            <span className="font-mono tracking-widest font-semibold text-foreground">
              {code}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to={`/auth?mode=signup&redirect=${encodeURIComponent(returnPath)}`}
              className="w-full min-h-[48px] inline-flex items-center justify-center bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Create account
            </Link>
            <Link
              to={`/auth?redirect=${encodeURIComponent(returnPath)}`}
              className="w-full min-h-[48px] inline-flex items-center justify-center border border-border rounded-xl text-sm font-semibold hover:border-foreground/30 transition-colors"
            >
              Log in
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <MicOff className="w-6 h-6 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Couldn't join</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{errorMsg}</p>
        <Link
          to="/"
          className="min-h-[44px] px-6 inline-flex items-center justify-center bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
        >
          Go home
        </Link>
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive shrink-0">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              LIVE
            </span>
            <p className="font-display font-bold text-base truncate">{sessionTitle}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground min-h-[36px] px-2"
          >
            Leave
          </button>
        </div>

        {/* Video block — own space */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border/60">
          <VideoGrid
            localStream={rtc.localStream}
            localName={displayName}
            cameraOn={rtc.cameraOn}
            micOn={rtc.micOn}
            remotePeers={rtc.remotePeers}
            onToggleCamera={rtc.toggleCamera}
            onToggleMic={rtc.toggleMic}
          />
        </div>

        {/* Status / transcript block — own space below */}
        <div className="flex-1 flex flex-col items-center text-center gap-1 px-4 py-6 overflow-y-auto">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            You are Speaker {speakerSlot}
          </p>
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-primary font-semibold">
              <Mic className="w-3.5 h-3.5" />
              Mic active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Connecting…
            </span>
          )}
          {(micError || rtc.error) && (
            <p className="mt-2 text-xs text-destructive max-w-xs">
              {micError || rtc.error}
            </p>
          )}
          {interimText && (
            <p className="mt-3 text-sm text-foreground/80 italic max-w-sm leading-relaxed">
              "{interimText}"
            </p>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 text-center">
          <p className="text-[11px] text-muted-foreground">
            Keep this tab open. Your speech is captured here.
          </p>
        </div>
      </div>
    );
  }

  // ── Setup ──
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-h-[44px] mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-bold">Joining session</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Code <span className="font-mono tracking-widest font-semibold text-foreground">{code}</span>
          </p>

          <div className="mt-6 space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">
                Your display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none font-display text-lg"
                autoFocus
                maxLength={32}
              />
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">
                Pick an avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`min-h-[44px] aspect-square text-2xl rounded-lg border transition-colors ${
                      emoji === e
                        ? "border-primary bg-primary/5"
                        : "border-border bg-secondary/40 hover:border-primary/30"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={phase === "loading" || !displayName.trim()}
              className="w-full min-h-[52px] bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {phase === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              Tap to join &amp; start mic
            </button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Your microphone will turn on after you tap. You can leave anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LiveJoinPage;
