import { Loader2, Mic, MicOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

interface Props {
  sessionTitle: string;
  stream: MediaStream | null;
  mode: "own_mic" | "voice_detect_only";
  lockReason?: string | null;
  onLeave?: () => void;
}

export default function WaitingForHost({ sessionTitle, stream, mode, lockReason, onLeave }: Props) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!stream || mode !== "own_mic") return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sumSq += v * v; }
      setLevel(Math.min(1, Math.sqrt(sumSq / data.length) * 4));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); ctx.close().catch(() => undefined); };
  }, [stream, mode]);
  const bars = 14;
  return (
    <div className="space-y-5 text-center">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <p className="text-sm font-body text-muted-foreground">Waiting for host to start…</p>
      </div>
      <h2 className="font-display text-xl text-foreground">{sessionTitle}</h2>
      {mode === "own_mic" ? (
        <div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-body mb-2">
            <Mic className="w-3.5 h-3.5" />
            Mic connected — host can hear levels
          </div>
          <div className="flex items-end gap-1 h-12 bg-accent rounded-lg p-2 max-w-xs mx-auto">
            {Array.from({ length: bars }).map((_, i) => {
              const t = (i + 1) / bars;
              const on = level >= t * 0.9;
              return <div key={i} className={`flex-1 rounded-sm ${on ? "bg-foreground" : "bg-foreground/15"}`} style={{ height: `${Math.max(15, level * 100 * (0.5 + t * 0.7))}%` }} />;
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-body">
          <MicOff className="w-4 h-4" />Using room mic — voice-detection only
        </div>
      )}
      {lockReason && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-accent/60 rounded-full px-3 py-1">
          <Lock className="w-3 h-3" />{lockReason}
        </div>
      )}
      {onLeave && <Button variant="outline" onClick={onLeave} className="mt-2">Leave</Button>}
    </div>
  );
}