import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SessionKind } from "@/hooks/useMicLobby";

interface Props {
  kind: SessionKind;
  sessionId: string | null;
  userId: string | null;
  stream: MediaStream | null;
  children: ReactNode;
}

export default function MicConfirmButton({ kind, sessionId, userId, stream, children }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const loudSinceRef = useRef<number | null>(null);
  const wroteRef = useRef(false);

  useEffect(() => {
    if (!sessionId || !userId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("mic_connections")
        .select("voice_confirmed_at")
        .eq("session_kind", kind)
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .eq("status", "connected")
        .maybeSingle();
      if (!cancelled) setConfirmed(Boolean(data?.voice_confirmed_at));
    };
    load();
    const ch = supabase
      .channel(`mic-confirm-${kind}-${sessionId}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mic_connections", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const row = payload.new as any;
        if (row?.user_id === userId && row?.session_kind === kind) setConfirmed(Boolean(row.voice_confirmed_at));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [kind, sessionId, userId]);

  useEffect(() => {
    if (!stream || !sessionId || !userId || confirmed || wroteRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.min(1, Math.sqrt(sumSq / data.length) * 4);
      if (rms >= 0.08) {
        loudSinceRef.current ??= Date.now();
        if (Date.now() - loudSinceRef.current >= 500 && !wroteRef.current) {
          wroteRef.current = true;
          setConfirmed(true);
          (supabase as any)
            .from("mic_connections")
            .update({ voice_confirmed_at: new Date().toISOString(), last_audio_rms: rms, last_seen_at: new Date().toISOString() })
            .eq("session_kind", kind)
            .eq("session_id", sessionId)
            .eq("user_id", userId)
            .eq("status", "connected")
            .then(() => {});
        }
      } else {
        loudSinceRef.current = null;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ctx.close().catch(() => undefined); };
  }, [kind, sessionId, userId, stream, confirmed]);

  return (
    <span className="relative inline-flex">
      {children}
      {confirmed && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background inline-flex items-center justify-center shadow-sm" title="Voice confirmed">
          <Check className="w-2.5 h-2.5 text-white" />
        </span>
      )}
    </span>
  );
}