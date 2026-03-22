import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptEntry {
  id: string;
  speaker_side: string;
  text: string;
  subtopic: string;
  timestamp: number;
  is_final: boolean;
  ai_summary?: string;
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

const mergeTranscriptEntries = (
  current: TranscriptEntry[],
  incoming: TranscriptEntry[]
): TranscriptEntry[] => {
  const merged = new Map<string, TranscriptEntry>();

  current.forEach((entry) => merged.set(entry.id, entry));
  incoming.forEach((entry) => {
    const existing = merged.get(entry.id);
    merged.set(entry.id, existing
      ? {
          ...existing,
          ...entry,
          ai_summary: entry.ai_summary ?? existing.ai_summary,
        }
      : entry);
  });

  return Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp);
};

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
  const [micError, setMicError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSideRef = useRef(currentSpeakerSide);
  const currentSubtopicRef = useRef(currentSubtopic);
  const argumentMapRef = useRef<ArgumentMapEntry[]>([]);

  // Accumulate finals into a single statement until UtteranceEnd
  const statementBufferRef = useRef("");
  const statementSideRef = useRef(currentSpeakerSide);
  const statementSubtopicRef = useRef(currentSubtopic);

  // Keep refs in sync
  useEffect(() => { currentSideRef.current = currentSpeakerSide; }, [currentSpeakerSide]);
  useEffect(() => { currentSubtopicRef.current = currentSubtopic; }, [currentSubtopic]);
  useEffect(() => { argumentMapRef.current = argumentMap; }, [argumentMap]);

  const persistTranscriptEntries = useCallback((entries: TranscriptEntry[]) => {
    return supabase
      .from("debate_transcripts" as any)
      .upsert({
        debate_id: debateId,
        transcript_entries: entries,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "debate_id" });
  }, [debateId]);

  const persistArgumentMap = useCallback((entries: ArgumentMapEntry[]) => {
    return supabase
      .from("debate_transcripts" as any)
      .upsert({
        debate_id: debateId,
        argument_map: entries,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "debate_id" });
  }, [debateId]);

  // Generate AI summary for a single statement
  const generateSummary = useCallback(async (entryId: string, text: string, speakerSide: string) => {
    if (!text.trim()) return;

    try {
      const { data, error } = await supabase.functions.invoke("analyze-transcript", {
        body: {
          transcriptChunk: text,
          existingMap: argumentMapRef.current,
          sides,
          speakerSide,
          currentSubtopic: currentSubtopicRef.current,
        },
      });

      if (!error) {
        const summary = typeof data?.summary === "string"
          ? data.summary.trim()
          : data?.entries?.map((e: any) => e.content).join(" ").trim();

        if (summary) {
          setTranscriptEntries((prev) => {
            const updated = prev.map((e) => e.id === entryId ? { ...e, ai_summary: summary } : e);
            persistTranscriptEntries(updated).then(() => {});
            return updated;
          });
        }

        if (!data?.entries?.length) return;

        // Also add to argument map
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
          persistArgumentMap(updated).then(() => {});
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to generate summary:", err);
    }
  }, [persistArgumentMap, persistTranscriptEntries, sides]);

  const analyzeChunk = useCallback(async (_text: string) => {
    // Analysis is now handled inside generateSummary
  }, []);

  // Flush accumulated statement buffer into a TranscriptEntry
  const flushStatement = useCallback(() => {
    const text = statementBufferRef.current.trim();
    if (!text) return;

    const entry: TranscriptEntry = {
      id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker_side: statementSideRef.current,
      text,
      subtopic: statementSubtopicRef.current,
      timestamp: Date.now(),
      is_final: true,
    };

    statementBufferRef.current = "";

    setTranscriptEntries((prev) => {
      const updated = [...prev, entry];
      persistTranscriptEntries(updated).then(() => {});
      return updated;
    });

    generateSummary(entry.id, text, entry.speaker_side);
    analyzeChunk(text);
  }, [analyzeChunk, generateSummary, persistTranscriptEntries]);

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setMicError(null);
    setConnectionError(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        });
      } catch (err: any) {
        const msg = err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone in your browser settings for transcription and argument mapping to work."
          : "Could not access microphone. Transcription will not function.";
        setMicError(msg);
        console.error("Mic permission error:", err);
        return;
      }
      mediaStreamRef.current = stream;

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("deepgram-token");
      if (tokenError || !tokenData?.key) {
        setConnectionError("Failed to initialize transcription service. Please try refreshing.");
        console.error("Failed to get Deepgram token:", tokenError);
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        return;
      }

      // Increased endpointing (3s) and utterance_end_ms (5s) so pauses don't split statements
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&interim_results=true&endpointing=3000&utterance_end_ms=5000&vad_events=true&encoding=linear16&sample_rate=16000`,
        ["token", tokenData.key]
      );

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);

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

          // UtteranceEnd event: flush accumulated statement
          if (data.type === "UtteranceEnd") {
            flushStatement();
            setInterimText("");
            return;
          }

          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript;
            if (!transcript) return;

            if (data.is_final) {
              // If speaker side changed, flush previous statement first
              if (statementBufferRef.current && statementSideRef.current !== currentSideRef.current) {
                flushStatement();
              }
              // Accumulate into current statement — strictly attributed to the CURRENT speaker side
              statementSideRef.current = currentSideRef.current;
              statementSubtopicRef.current = currentSubtopicRef.current;
              statementBufferRef.current += (statementBufferRef.current ? " " : "") + transcript;
              setInterimText("");
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
        setConnectionError("Transcription connection failed. Real-time transcription is unavailable.");
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to connect to Deepgram:", err);
      setConnectionError("Failed to start transcription. Please try refreshing.");
    }
  }, [debateId, flushStatement]);

  const disconnect = useCallback(() => {
    // Flush any remaining statement
    if (statementBufferRef.current.trim()) {
      flushStatement();
    }

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
  }, [flushStatement]);

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

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`transcript-${debateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debate_transcripts", filter: `debate_id=eq.${debateId}` },
        (payload) => {
          const d = payload.new as any;
          if (Array.isArray(d?.argument_map)) {
            setArgumentMap(d.argument_map);
          }
          if (Array.isArray(d?.transcript_entries)) {
            setTranscriptEntries((prev) => mergeTranscriptEntries(prev, d.transcript_entries));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [debateId]);

  // Add a text-submitted argument as a transcript entry with AI summarization
  const addTextEntry = useCallback((text: string, side: string, subtopic: string) => {
    if (!text.trim()) return;

    const entry: TranscriptEntry = {
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker_side: side,
      text: text.trim(),
      subtopic,
      timestamp: Date.now(),
      is_final: true,
    };

    setTranscriptEntries((prev) => {
      const updated = [...prev, entry];
      persistTranscriptEntries(updated).then(() => {});
      return updated;
    });

    // Generate AI summary for this text entry
    generateSummary(entry.id, text.trim(), side);
  }, [generateSummary, persistTranscriptEntries]);

  return {
    transcriptEntries,
    argumentMap,
    interimText,
    isConnected,
    micError,
    connectionError,
    connect,
    disconnect,
    addTextEntry,
  };
}
