import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MicTestStepProps {
  /** Called once the user has proven their mic works and tapped Continue. */
  onReady: (stream: MediaStream) => void;
  /** Called if the user opts to skip the mic check and join as audience. */
  onSkipToAudience?: () => void;
  continueLabel?: string;
}

/**
 * Pre-flight microphone check used by in-person joiners.
 * - Requests mic permission immediately on mount.
 * - Shows a live level meter and a device picker.
 * - Continue button is gated until we observe ≥1s of voiced audio.
 * - Hands the live MediaStream off to the parent (no second prompt downstream).
 */
export default function MicTestStep({ onReady, onSkipToAudience, continueLabel = "Continue" }: MicTestStepProps) {
  const [permission, setPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [level, setLevel] = useState(0); // 0..1
  const [voicedMs, setVoicedMs] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  const stopStream = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const startStream = async (preferredDeviceId?: string) => {
    setError(null);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: preferredDeviceId
          ? { deviceId: { exact: preferredDeviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setPermission("granted");

      // Now that permission is granted, device labels are available
      const all = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = all.filter((d) => d.kind === "audioinput");
      setDevices(audioInputs);
      const activeId = stream.getAudioTracks()[0]?.getSettings().deviceId ?? audioInputs[0]?.deviceId ?? "";
      setDeviceId(activeId);

      // Spin up analyser
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      lastTickRef.current = performance.now();
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        // Compute RMS (0..1)
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / data.length);
        const lvl = Math.min(1, rms * 4); // perceptual boost
        setLevel(lvl);

        const now = performance.now();
        const dt = now - lastTickRef.current;
        lastTickRef.current = now;
        if (lvl > 0.08) {
          setVoicedMs((ms) => Math.min(ms + dt, 4000));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      console.error("Mic permission/start failed:", err);
      setPermission("denied");
      setError(err?.message || "Microphone access was blocked.");
    }
  };

  // Initial mount → request permission
  useEffect(() => {
    startStream();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeviceChange = async (id: string) => {
    setDeviceId(id);
    setVoicedMs(0);
    await startStream(id);
  };

  const ready = voicedMs >= 1000 && permission === "granted";

  const handleContinue = () => {
    if (!streamRef.current) return;
    // Hand off the live stream — caller is responsible for stopping it later.
    const out = streamRef.current;
    streamRef.current = null; // prevent our cleanup from killing the handed-off stream
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
    }
    onReady(out);
  };

  // Build 16 bars driven by `level`, with a "lit" threshold per bar.
  const bars = Array.from({ length: 16 });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            permission === "granted" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          {permission === "denied" ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-display text-foreground">
            {permission === "granted" ? "Speak now to test your mic" : permission === "denied" ? "Mic access blocked" : "Requesting mic access…"}
          </p>
          <p className="text-xs text-muted-foreground font-body">
            {permission === "granted"
              ? ready
                ? "Sounds great. You're ready to join."
                : "Say a few words so we know you're audible."
              : permission === "denied"
              ? "Enable microphone in your browser settings, then retry."
              : "Approve the permission prompt to continue."}
          </p>
        </div>
      </div>

      {/* Level meter */}
      <div className="flex items-end gap-1 h-12 bg-accent rounded-lg p-2">
        {bars.map((_, i) => {
          const threshold = (i + 1) / bars.length;
          const lit = level >= threshold * 0.9;
          const heightPct = Math.max(8, Math.min(100, level * 100 * (0.5 + (i / bars.length) * 0.7)));
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-colors ${lit ? "bg-foreground" : "bg-foreground/15"}`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>

      {/* Device picker */}
      {permission === "granted" && devices.length > 1 && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1 block">
            Microphone
          </label>
          <select
            value={deviceId}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && permission === "denied" && (
        <p className="text-xs text-destructive font-body">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        {permission === "denied" ? (
          <Button onClick={() => startStream(deviceId || undefined)} className="w-full">
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry mic access
          </Button>
        ) : (
          <Button onClick={handleContinue} disabled={!ready} className="w-full">
            <Mic className="w-4 h-4 mr-1" />
            {ready ? continueLabel : "Listening…"}
          </Button>
        )}
        {onSkipToAudience && (
          <Button variant="outline" onClick={onSkipToAudience} className="w-full">
            Join as audience instead
          </Button>
        )}
      </div>
    </div>
  );
}