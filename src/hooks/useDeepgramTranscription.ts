import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptEntry {
  speaker_side: string;
  text: string;
  timestamp: number;
  is_final: boolean;
}

export interface ArgumentMapEntry {
  id: string;
  type: "claim" | "counter" | "stake" | "quote" | "evidence";
  speaker_side: string;
  content: string;
  quote?: string;
  parent_index?: number;
  subtopic: string;
  created_at: number;
}

interface UseDeepgramTranscriptionProps {
  debateId: string;
  currentSpeakerSide: string;
  currentSubtopic: string;
  sides: string[];
  isActive: boolean;
}

export function useDeepgramTranscription({
  debateId,
  currentSpeakerSide,
  currentSubtopic,
  sides,
  isActive,
}: UseDeepgramTranscriptionProps) {
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [argumentMap, setArgumentMap] = useState<ArgumentMapEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [interimText, setInterimText] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptBufferRef = useRef("");
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const currentSideRef = useRef(currentSpeakerSide);
  const currentSubtopicRef = useRef(currentSubtopic);
  const argumentMapRef = useRef<ArgumentMapEntry[]>([]);

  // Keep refs in sync
  useEffect(() => { currentSideRef.current = currentSpeakerSide; }, [currentSpeakerSide]);
  useEffect(() => { currentSubtopicRef.current = currentSubtopic; }, [currentSubtopic]);
  useEffect(() => { argumentMapRef.current = argumentMap; }, [argumentMap]);

  const analyzeBuffer = useCallback(async () => {
    const buffer = transcriptBufferRef.current.trim();
    if (!buffer || buffer.length < 20) return;

    transcriptBufferRef.current = "";

    try {
      const { data, error } = await supabase.functions.invoke("analyze-transcript", {
        body: {
          transcriptChunk: buffer,
          existingMap: argumentMapRef.current,
          sides,
          currentSubtopic: currentSubtopicRef.current,
        },
      });

      if (error) {
        console.error("Analyze transcript error:", error);
        return;
      }

      if (data?.entries?.length > 0) {
        const newEntries: ArgumentMapEntry[] = data.entries.map((e: any, i: number) => ({
          id: `${Date.now()}-${i}`,
          type: e.type,
          speaker_side: e.speaker_side,
          content: e.content,
          quote: e.quote || undefined,
          parent_index: e.parent_index,
          subtopic: currentSubtopicRef.current,
          created_at: Date.now(),
        }));

        setArgumentMap((prev) => {
          const updated = [...prev, ...newEntries];
          // Save to database
          supabase
            .from("debate_transcripts" as any)
            .upsert({
              debate_id: debateId,
              argument_map: updated,
              updated_at: new Date().toISOString(),
            } as any, { onConflict: "debate_id" })
            .then(() => {});
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to analyze transcript:", err);
    }
  }, [debateId, sides]);

  const connect = useCallback(async () => {
    if (wsRef.current) return;

    try {
      // Get Deepgram token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("deepgram-token");
      if (tokenError || !tokenData?.key) {
        console.error("Failed to get Deepgram token:", tokenError);
        return;
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      mediaStreamRef.current = stream;

      // Create WebSocket to Deepgram
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&interim_results=true&utterance_end_ms=1000&vad_events=true&encoding=linear16&sample_rate=16000`,
        ["token", tokenData.key]
      );

      ws.onopen = () => {
        setIsConnected(true);

        // Set up audio processing
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32767)));
            }
            ws.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript;
            if (!transcript) return;

            const entry: TranscriptEntry = {
              speaker_side: currentSideRef.current,
              text: transcript,
              timestamp: Date.now(),
              is_final: data.is_final,
            };

            if (data.is_final) {
              setTranscriptEntries((prev) => {
                const updated = [...prev, { ...entry, is_final: true }];
                // Save transcript entries to DB
                supabase
                  .from("debate_transcripts" as any)
                  .upsert({
                    debate_id: debateId,
                    transcript_entries: updated,
                    updated_at: new Date().toISOString(),
                  } as any, { onConflict: "debate_id" })
                  .then(() => {});
                return updated;
              });
              setInterimText("");

              // Buffer for AI analysis
              transcriptBufferRef.current += " " + transcript;

              // Debounce analysis: analyze after 3 seconds of no new finals
              clearTimeout(analyzeTimeoutRef.current);
              analyzeTimeoutRef.current = setTimeout(analyzeBuffer, 3000);
            } else {
              setInterimText(transcript);
            }
          }
        } catch (err) {
          console.error("Deepgram message parse error:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = (err) => {
        console.error("Deepgram WebSocket error:", err);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to connect to Deepgram:", err);
    }
  }, [debateId, analyzeBuffer]);

  const disconnect = useCallback(() => {
    // Flush any remaining transcript buffer
    if (transcriptBufferRef.current.trim()) {
      analyzeBuffer();
    }
    clearTimeout(analyzeTimeoutRef.current);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setIsConnected(false);
    setInterimText("");
  }, [analyzeBuffer]);

  // Auto-connect/disconnect based on isActive
  useEffect(() => {
    if (isActive) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [isActive]);

  // Load existing transcript data on mount
  useEffect(() => {
    const loadExisting = async () => {
      const { data } = await supabase
        .from("debate_transcripts" as any)
        .select("*")
        .eq("debate_id", debateId)
        .single();

      if (data) {
        const d = data as any;
        if (d.transcript_entries?.length) setTranscriptEntries(d.transcript_entries);
        if (d.argument_map?.length) setArgumentMap(d.argument_map);
      }
    };
    loadExisting();
  }, [debateId]);

  // Subscribe to realtime updates for argument map from other participants
  useEffect(() => {
    const channel = supabase
      .channel(`transcript-${debateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debate_transcripts", filter: `debate_id=eq.${debateId}` },
        (payload) => {
          const d = payload.new as any;
          if (d?.argument_map?.length) {
            setArgumentMap(d.argument_map);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [debateId]);

  return {
    transcriptEntries,
    argumentMap,
    interimText,
    isConnected,
    connect,
    disconnect,
  };
}
