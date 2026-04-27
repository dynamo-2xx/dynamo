import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface InPersonMicBarProps {
  /** Existing live stream from the pre-flight mic test, if available. */
  initialStream?: MediaStream | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

/**
 * Persistent bottom bar for in-person joiners. Shows a live audio level
 * meter, a mute toggle, and a switch-device menu. Reuses the stream that
 * the pre-flight mic test handed off so the user is never re-prompted.
 *
 * If their stream goes silent for >10 s while unmuted, fires a toast.
 */
export default function InPersonMicBar({ initialStream, displayName, avatarUrl }: InPersonMicBarProps) {
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);

  const streamRef = useRef<MediaStream | null>(initialStream ?? null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silentSinceRef = useRef<number>(performance.now());
  const warnedRef = useRef<boolean>(false);

  const teardownAnalyser = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const attachAnalyser = (stream: MediaStream) => {
    teardownAnalyser();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    silentSinceRef.current = performance.now();
    warnedRef.current = false;

    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / data.length);
      const lvl = Math.min(1, rms * 4);
      setLevel(muted ? 0 : lvl);

      if (!muted) {
        if (lvl > 0.08) {
          silentSinceRef.current = performance.now();
          warnedRef.current = false;
        } else if (!warnedRef.current && performance.now() - silentSinceRef.current > 10000) {
          warnedRef.current = true;
          toast("We can't hear you — check your mic.", { duration: 4000 });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Bootstrap stream — use handoff if present, else request permission ourselves.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stream = streamRef.current;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        } catch (err) {
          console.warn("Mic bar could not acquire stream:", err);
          return;
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setActiveDeviceId(stream.getAudioTracks()[0]?.getSettings().deviceId);
      attachAnalyser(stream);

      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(all.filter((d) => d.kind === "audioinput"));
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
      teardownAnalyser();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mute applies to the actual track so transcription stops too.
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);

  const switchDevice = async (id: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: id }, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = newStream;
      setActiveDeviceId(id);
      setDeviceMenuOpen(false);
      attachAnalyser(newStream);
    } catch (err) {
      console.error("Switch device failed", err);
      toast.error("Couldn't switch microphone.");
    }
  };

  const initials = (displayName || "You").trim().slice(0, 2).toUpperCase();
  const bars = Array.from({ length: 14 });

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)]">
      <div className="flex items-center gap-3 bg-background/95 backdrop-blur border border-border rounded-full pl-2 pr-3 py-2 shadow-lg">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName || "You"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-display">{initials}</span>
          )}
        </div>

        {/* Level meter */}
        <div className="flex items-end gap-[2px] h-5 w-32">
          {bars.map((_, i) => {
            const threshold = (i + 1) / bars.length;
            const lit = !muted && level >= threshold * 0.9;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${lit ? "bg-foreground" : "bg-foreground/15"}`}
                style={{ height: `${Math.max(15, (i / bars.length) * 100)}%` }}
              />
            );
          })}
        </div>

        {/* Mute toggle */}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            muted ? "bg-destructive/15 text-destructive" : "bg-accent text-foreground hover:bg-accent/80"
          }`}
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Device switch */}
        {devices.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setDeviceMenuOpen((o) => !o)}
              aria-label="Switch microphone"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-foreground hover:bg-accent/80 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            {deviceMenuOpen && (
              <div className="absolute bottom-12 right-0 bg-background border border-border rounded-lg shadow-lg p-1 min-w-[200px]">
                {devices.map((d) => (
                  <button
                    key={d.deviceId}
                    onClick={() => switchDevice(d.deviceId)}
                    className={`w-full text-left text-xs font-body px-3 py-2 rounded-md hover:bg-accent ${
                      d.deviceId === activeDeviceId ? "bg-accent text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}