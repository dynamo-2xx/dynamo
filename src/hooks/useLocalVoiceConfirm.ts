import { useEffect, useRef, useState } from "react";

/**
 * Local-only voice confirmation. Mirrors the RMS gate used by
 * `MicConfirmButton` (rms >= 0.08 sustained 500ms) but writes nothing to the
 * DB — just flips `confirmed` to true the first time the user clearly speaks.
 *
 * Resets when the stream identity changes or when `active` flips off.
 */
export function useLocalVoiceConfirm(
  stream: MediaStream | null,
  active: boolean,
): boolean {
  const [confirmed, setConfirmed] = useState(false);
  const loudSinceRef = useRef<number | null>(null);

  useEffect(() => {
    setConfirmed(false);
    loudSinceRef.current = null;
  }, [stream]);

  useEffect(() => {
    if (!active || !stream || confirmed) return;
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!AC) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AC();
    } catch {
      return;
    }
    let source: MediaStreamAudioSourceNode;
    try {
      source = ctx.createMediaStreamSource(stream);
    } catch {
      ctx.close().catch(() => undefined);
      return;
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.min(1, Math.sqrt(sumSq / data.length) * 4);
      if (rms >= 0.08) {
        loudSinceRef.current ??= Date.now();
        if (Date.now() - loudSinceRef.current >= 500) {
          setConfirmed(true);
          stopped = true;
          return;
        }
      } else {
        loudSinceRef.current = null;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ctx?.close().catch(() => undefined);
    };
  }, [stream, active, confirmed]);

  return confirmed;
}

export default useLocalVoiceConfirm;