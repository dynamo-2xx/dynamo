import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  sessionId: string | null;
  deviceId: string;
  speakerSlot: number;
  speakerName: string;
  isActive: boolean;
  /**
   * External mic-enabled gate. When false, audio is not sent to Deepgram and
   * no transcript rows are inserted. Defaults to true for backwards compat.
   */
  isMicEnabled?: boolean;
  /**
   * Optional external MediaStream to consume audio from. When provided, this
   * hook will NOT call getUserMedia itself — preventing conflicts with another
   * owner (e.g. WebRTC). The Web Audio graph is rebuilt whenever the underlying
   * audio track changes (signaled via `streamVersion`).
   */
  externalStream?: MediaStream | null;
  streamVersion?: number;
}

/**
 * Per-device Deepgram transcription. Writes each is_final result into
 * live_session_entries (for host merge) and broadcasts interim text on the
 * `live:{sessionId}` channel for low-latency UI.
 */
export function useDeviceTranscription({
  sessionId,
  deviceId,
  speakerSlot,
  speakerName,
  isActive,
  isMicEnabled = true,
  externalStream = null,
  streamVersion = 0,
}: Options) {
  const [interimText, setInterimText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const micEnabledRef = useRef(isMicEnabled);
  useEffect(() => {
    micEnabledRef.current = isMicEnabled;
    if (!isMicEnabled) setInterimText("");
  }, [isMicEnabled]);

  const wsRef = useRef<WebSocket | null>(null);
  const ownedStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const broadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const tearDownAudioGraph = useCallback(() => {
    try { sourceRef.current?.disconnect(); } catch {}
    try { processorRef.current?.disconnect(); } catch {}
    sourceRef.current = null;
    processorRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    tearDownAudioGraph();
    try { audioCtxRef.current?.close(); } catch {}
    try { ownedStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { wsRef.current?.close(); } catch {}
    if (broadcastRef.current) {
      supabase.removeChannel(broadcastRef.current);
      broadcastRef.current = null;
    }
    audioCtxRef.current = null;
    ownedStreamRef.current = null;
    wsRef.current = null;
    setIsConnected(false);
    setInterimText("");
  }, [tearDownAudioGraph]);

  // Main lifecycle: open WS + (optionally) own a mic, then build the audio graph.
  useEffect(() => {
    if (!isActive || !sessionId) return;

    let cancelled = false;

    const start = async () => {
      try {
        // 1) Get Deepgram key
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
          "deepgram-token",
          {},
        );
        if (tokenError) throw tokenError;
        const dgKey = (tokenData as any)?.key;
        if (!dgKey) throw new Error("Deepgram key unavailable");

        // 2) Audio source: external stream if provided, else own one
        if (!externalStream) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          ownedStreamRef.current = stream;
        }

        const AudioCtx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx: AudioContext = new AudioCtx({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        // 3) Open WS
        const url =
          "wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&endpointing=800&smart_format=true&punctuate=true";
        const ws = new WebSocket(url, ["token", dgKey]);
        wsRef.current = ws;

        // 4) Realtime broadcast channel for interim
        const bChannel = supabase.channel(`live:${sessionId}`, {
          config: { broadcast: { ack: false } },
        });
        bChannel.subscribe();
        broadcastRef.current = bChannel;

        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
          if (cancelled) return;
          setIsConnected(true);
        };

        ws.onmessage = async (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const alt = msg?.channel?.alternatives?.[0];
            if (!alt?.transcript) return;
            // Drop any results that arrive while mic is off
            if (!micEnabledRef.current) return;
            const transcript: string = alt.transcript;
            const isFinal: boolean = !!msg.is_final;
            if (!isFinal) {
              setInterimText(transcript);
              bChannel.send({
                type: "broadcast",
                event: "interim",
                payload: { device_id: deviceId, speaker_slot: speakerSlot, speaker_name: speakerName, text: transcript },
              });
              return;
            }
            setInterimText("");
            const trimmed = transcript.trim();
            if (!trimmed) return;
            await (supabase as any).from("live_session_entries").insert({
              session_id: sessionId,
              device_id: deviceId,
              speaker_slot: speakerSlot,
              speaker_name: speakerName,
              text: trimmed,
              words: alt.words ?? [],
              client_ts: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("dg parse error", e);
          }
        };

        ws.onerror = () => setError("Microphone connection error");
        ws.onclose = () => setIsConnected(false);
      } catch (e: any) {
        console.error("device transcription start error", e);
        setError(e?.message ?? "Failed to start microphone");
      }
    };

    start();
    return () => {
      cancelled = true;
      cleanup();
    };
    // NOTE: externalStream IDENTITY changes (e.g. bumpStream) shouldn't tear
    // down the WS/context. Track changes are handled by the second effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sessionId, deviceId, speakerSlot, speakerName, cleanup]);

  // Build / rebuild the Web Audio graph whenever the active source changes.
  // Keyed on streamVersion so toggleMic restarts produce a fresh graph bound
  // to the new audio track.
  useEffect(() => {
    if (!isActive || !sessionId) return;
    const audioCtx = audioCtxRef.current;
    const ws = wsRef.current;
    if (!audioCtx || !ws) return;

    const sourceStream = externalStream ?? ownedStreamRef.current;
    if (!sourceStream) return;
    if (sourceStream.getAudioTracks().length === 0) {
      tearDownAudioGraph();
      return;
    }

    tearDownAudioGraph();
    try {
      const source = audioCtx.createMediaStreamSource(sourceStream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      sourceRef.current = source;
      processorRef.current = processor;

      processor.onaudioprocess = (ev) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!micEnabledRef.current) return;
        const input = ev.inputBuffer.getChannelData(0);
        const buf = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        wsRef.current.send(buf.buffer);
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (e) {
      console.warn("[device-transcription] audio graph build failed", e);
    }
    // streamVersion ensures we rebuild after toggleMic acquires a new track.
  }, [isActive, sessionId, externalStream, streamVersion, isConnected, tearDownAudioGraph]);

  return { interimText, isConnected, error };
}
