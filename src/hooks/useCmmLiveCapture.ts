import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CmmTranscriptEntry {
  id: string;
  speaker_side: "owner" | "challenger" | "interruption";
  speaker_label: string;
  text: string;
  timestamp: number;
  /** For interruption entries only: end timestamp (ms epoch). */
  end_timestamp?: number;
}

interface UseCmmLiveCaptureProps {
  debateId: string | null;
  active: boolean;
  ownerLabel: string;
  challengerLabel: string;
  /**
   * If set, every utterance captured on this device is tagged with this side
   * regardless of Deepgram's diarization output. Use 'owner' on the publisher's
   * device and 'challenger' on the active challenger's device so each mic owns
   * its own attribution. When omitted, falls back to diarization heuristic
   * (speaker 0 -> owner, others -> challenger) for single-mic scenarios.
   */
  fixedSide?: "owner" | "challenger";
  /** When true, audio frames are dropped before sending to Deepgram. */
  muted?: boolean;
}

/**
 * Lightweight single-device transcription for Change My Mind rounds.
 * Streams from Deepgram and persists merged entries into debate_transcripts.transcript_entries.
 * Speaker mapping: speaker 0 -> owner, speaker 1+ -> challenger (heuristic; both at one mic).
 */
export function useCmmLiveCapture({ debateId, active, ownerLabel, challengerLabel, fixedSide, muted }: UseCmmLiveCaptureProps) {
  const [entries, setEntries] = useState<CmmTranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const entriesRef = useRef<CmmTranscriptEntry[]>([]);
  const bufRef = useRef("");
  const bufSpeakerRef = useRef(0);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = !!muted; }, [muted]);

  useEffect(() => { entriesRef.current = entries; }, [entries]);

  const persist = useCallback(async (next: CmmTranscriptEntry[]) => {
    if (!debateId) return;
    // Fetch-and-merge to avoid trampling concurrent writes.
    const { data: row } = await supabase
      .from("debate_transcripts")
      .select("id, transcript_entries")
      .eq("debate_id", debateId)
      .maybeSingle();
    if (row?.id) {
      await supabase.from("debate_transcripts").update({ transcript_entries: next as any }).eq("id", row.id);
    } else {
      await supabase.from("debate_transcripts").insert({ debate_id: debateId, transcript_entries: next as any });
    }
  }, [debateId]);

  const flush = useCallback(() => {
    const text = bufRef.current.trim();
    if (!text) return;
    const speakerSide: "owner" | "challenger" = fixedSide
      ? fixedSide
      : bufSpeakerRef.current === 0 ? "owner" : "challenger";
    const entry: CmmTranscriptEntry = {
      id: `cmm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker_side: speakerSide,
      speaker_label: speakerSide === "owner" ? ownerLabel : challengerLabel,
      text,
      timestamp: Date.now(),
    };
    bufRef.current = "";
    setEntries((prev) => {
      const next = [...prev, entry];
      persist(next);
      return next;
    });
  }, [ownerLabel, challengerLabel, persist, fixedSide]);

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      const { data: tok, error: tokErr } = await supabase.functions.invoke("deepgram-token");
      if (tokErr || !tok?.key) {
        setMicError("Failed to start transcription.");
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&interim_results=true&diarize=true&endpointing=1000&utterance_end_ms=2000&vad_events=true&encoding=linear16&sample_rate=16000`,
        ["token", tok.key],
      );

      ws.onopen = () => {
        setIsConnected(true);
        const ctx = new AudioContext({ sampleRate: 16000 });
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        procRef.current = proc;
        proc.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (mutedRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
          if (Math.sqrt(sum / input.length) < 0.008) return;
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32767)));
          ws.send(pcm.buffer);
        };
        src.connect(proc);
        proc.connect(ctx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "UtteranceEnd") { flush(); setInterimText(""); return; }
          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0];
            const transcript = alt.transcript;
            if (!transcript) return;
            if (data.is_final) {
              const words = alt.words || [];
              const speaker = (words[0]?.speaker ?? 0) > 0 ? 1 : 0;
              if (bufRef.current && bufSpeakerRef.current !== speaker) flush();
              bufSpeakerRef.current = speaker;
              bufRef.current += (bufRef.current ? " " : "") + transcript;
              flush();
              setInterimText("");
            } else {
              setInterimText(transcript);
            }
          }
        } catch (err) { console.error("[cmm] parse err", err); }
      };

      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => { setIsConnected(false); setMicError("Transcription connection failed."); };
      wsRef.current = ws;
    } catch (err: any) {
      setMicError(err?.name === "NotAllowedError" ? "Microphone access denied." : "Could not access microphone.");
    }
  }, [flush]);

  const disconnect = useCallback(() => {
    if (bufRef.current.trim()) flush();
    wsRef.current?.close(); wsRef.current = null;
    procRef.current?.disconnect(); procRef.current = null;
    ctxRef.current?.close(); ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    setIsConnected(false);
    setInterimText("");
  }, [flush]);

  // Auto connect/disconnect with `active` flag.
  useEffect(() => {
    if (active) connect(); else disconnect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Load existing transcript on mount.
  useEffect(() => {
    if (!debateId) return;
    (async () => {
      const { data } = await supabase
        .from("debate_transcripts")
        .select("transcript_entries")
        .eq("debate_id", debateId)
        .maybeSingle();
      const list = (data?.transcript_entries as any) ?? [];
      if (Array.isArray(list) && list.length) {
        // Keep any entry with a recognized speaker_side. Interruption entries
        // may have empty text (they're pure timeline markers).
        const filtered = list.filter(
          (e: any) => e?.speaker_side && (e.speaker_side === "interruption" || e?.text),
        ) as CmmTranscriptEntry[];
        setEntries(filtered);
      }
    })();
  }, [debateId]);

  // Subscribe to remote transcript updates so non-capturing devices stay in sync.
  useEffect(() => {
    if (!debateId) return;
    const channel = supabase
      .channel(`cmm-transcript-${debateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debate_transcripts", filter: `debate_id=eq.${debateId}` },
        (payload) => {
          const next = (payload.new as any)?.transcript_entries;
          if (!Array.isArray(next)) return;
          const filtered = next.filter(
            (e: any) => e?.speaker_side && (e.speaker_side === "interruption" || e?.text),
          ) as CmmTranscriptEntry[];
          // Only overwrite if remote is longer (avoid clobbering local capture mid-flight).
          setEntries((prev) => (filtered.length >= prev.length ? filtered : prev));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [debateId]);

  // Reset speaker buffer when round (active) flips.
  useEffect(() => { bufRef.current = ""; bufSpeakerRef.current = 0; }, [active]);

  return { entries, interimText, isConnected, micError, connect, disconnect };
}