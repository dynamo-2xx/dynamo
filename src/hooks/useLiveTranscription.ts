import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveTranscriptEntry {
  id: string;
  speaker_id: number; // from Deepgram diarization (0, 1, 2...)
  speaker_label: string; // "Speaker 1", "Speaker 2", etc.
  text: string;
  words?: { word: string; speaker: number }[];
  subtopic?: string;
  timestamp: number;
  is_final: boolean;
  uncertain?: boolean;
}

export interface LiveSummary {
  id: string;
  text: string;
  overall_summary?: string;
  subtopic_summaries?: Record<string, string>;
  created_at: number;
  subtopics: string[];
}

interface UseLiveTranscriptionProps {
  sessionId: string | null;
  isActive: boolean;
}

export function useLiveTranscription({ sessionId, isActive }: UseLiveTranscriptionProps) {
  const [transcriptEntries, setTranscriptEntries] = useState<LiveTranscriptEntry[]>([]);
  const [summaries, setSummaries] = useState<LiveSummary[]>([]);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptEntriesRef = useRef<LiveTranscriptEntry[]>([]);
  const summariesRef = useRef<LiveSummary[]>([]);
  const subtopicsRef = useRef<string[]>([]);
  const hasSummarizedRef = useRef(false);

  // Accumulate finals into a single statement until UtteranceEnd
  const statementBufferRef = useRef("");
  const statementSpeakerRef = useRef(0);

  useEffect(() => { transcriptEntriesRef.current = transcriptEntries; }, [transcriptEntries]);
  useEffect(() => { summariesRef.current = summaries; }, [summaries]);
  useEffect(() => { subtopicsRef.current = subtopics; }, [subtopics]);

  const persistSession = useCallback(async (updates: Record<string, any>) => {
    if (!sessionId) return;
    await supabase
      .from("live_sessions" as any)
      .update(updates as any)
      .eq("id", sessionId);
  }, [sessionId]);

  // Track words for split functionality
  const statementWordsRef = useRef<{ word: string; speaker: number }[]>([]);

  const flushStatement = useCallback(() => {
    const text = statementBufferRef.current.trim();
    if (!text) return;

    const speakerId = statementSpeakerRef.current;
    const words = [...statementWordsRef.current];
    const hasSpeakerInfo = words.some(w => w.speaker !== undefined);
    const entry: LiveTranscriptEntry = {
      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker_id: speakerId,
      speaker_label: `Speaker ${speakerId + 1}`,
      text,
      words,
      timestamp: Date.now(),
      is_final: true,
      uncertain: !hasSpeakerInfo,
    };

    statementBufferRef.current = "";
    statementWordsRef.current = [];

    setTranscriptEntries((prev) => {
      const updated = [...prev, entry];
      persistSession({ transcript_entries: updated });
      return updated;
    });
  }, [persistSession]);

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
          ? "Microphone access denied. Please allow microphone in your browser settings."
          : "Could not access microphone.";
        setMicError(msg);
        return;
      }
      mediaStreamRef.current = stream;

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("deepgram-token");
      if (tokenError || !tokenData?.key) {
        setConnectionError("Failed to initialize transcription service.");
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        return;
      }

      // Enable diarization for speaker detection
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&interim_results=true&diarize=true&endpointing=1000&utterance_end_ms=2000&vad_events=true&encoding=linear16&sample_rate=16000`,
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
            // Audio energy gate — skip silent frames to improve diarization
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            if (rms < 0.008) return; // skip near-silent frames

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

          if (data.type === "UtteranceEnd") {
            flushStatement();
            setInterimText("");
            return;
          }

          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0];
            const transcript = alt.transcript;
            if (!transcript) return;

            if (data.is_final) {
              // Split words by speaker changes within this segment
              const words = alt.words || [];
              if (words.length === 0) {
                // No word-level data, treat as single speaker
              const speaker = 0;
                if (statementBufferRef.current && statementSpeakerRef.current !== speaker) {
                  flushStatement();
                }
                statementSpeakerRef.current = speaker;
                statementBufferRef.current += (statementBufferRef.current ? " " : "") + transcript;
                flushStatement();
              } else {
                // Group consecutive words by speaker
                let currentSpeaker = words[0].speaker ?? 0;
                let currentWords: string[] = [];

                for (const word of words) {
                  const wordSpeaker = word.speaker ?? 0;
                  if (wordSpeaker !== currentSpeaker) {
                    // Flush buffer if different speaker, then flush this group
                    if (statementBufferRef.current && statementSpeakerRef.current !== currentSpeaker) {
                      flushStatement();
                    }
                    statementSpeakerRef.current = currentSpeaker;
                    statementBufferRef.current += (statementBufferRef.current ? " " : "") + currentWords.join(" ");
                    flushStatement();

                    currentSpeaker = wordSpeaker;
                    currentWords = [];
                  }
                  const w = word.punctuated_word || word.word;
                  currentWords.push(w);
                  statementWordsRef.current.push({ word: w, speaker: wordSpeaker });
                }

                // Handle remaining words
                if (currentWords.length > 0) {
                  if (statementBufferRef.current && statementSpeakerRef.current !== currentSpeaker) {
                    flushStatement();
                  }
                  statementSpeakerRef.current = currentSpeaker;
                  statementBufferRef.current += (statementBufferRef.current ? " " : "") + currentWords.join(" ");
                }
              }
              // Flush immediately after every final so entries appear in real-time
              flushStatement();
              setInterimText("");
            } else {
              setInterimText(transcript);
            }
          }
        } catch (err) {
          console.error("Deepgram message parse error:", err);
        }
      };

      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => {
        setIsConnected(false);
        setConnectionError("Transcription connection failed.");
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to connect:", err);
      setConnectionError("Failed to start transcription.");
    }
  }, [flushStatement]);

  const disconnect = useCallback(() => {
    if (statementBufferRef.current.trim()) flushStatement();

    wsRef.current?.close();
    wsRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setIsConnected(false);
    setInterimText("");
  }, [flushStatement]);

  const generateSummary = useCallback(async () => {
    const entries = transcriptEntriesRef.current;
    if (!entries.length || isSummarizing) return;

    setIsSummarizing(true);
    hasSummarizedRef.current = true;

    try {
      const { data, error } = await supabase.functions.invoke("analyze-transcript", {
        body: {
          mode: "live_conversation",
          fullTranscript: entries.map((e) => ({
            id: e.id,
            speaker: e.speaker_label,
            text: e.text,
          })),
        },
      });

      if (!error && data) {
        const summary: LiveSummary = {
          id: `summary-${Date.now()}`,
          text: data.summary || "",
          created_at: Date.now(),
          subtopics: data.subtopics || [],
        };

        if (summary.text) {
          setSummaries((prev) => {
            const updated = [...prev, summary];
            persistSession({ summaries: updated });
            return updated;
          });
        }

        // Update subtopics
        if (data.subtopics?.length) {
          setSubtopics(data.subtopics);
          persistSession({ subtopics: data.subtopics });
        }

        // Update entry subtopic assignments
        if (data.entry_subtopic_map) {
          setTranscriptEntries((prev) => {
            const updated = prev.map((e) => ({
              ...e,
              subtopic: data.entry_subtopic_map[e.id] || e.subtopic,
            }));
            persistSession({ transcript_entries: updated });
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Failed to generate summary:", err);
    } finally {
      setIsSummarizing(false);
    }
  }, [isSummarizing, persistSession]);

  const endSession = useCallback(async () => {
    disconnect();

    // Always auto-generate a final summary on end
    if (transcriptEntriesRef.current.length > 0) {
      try {
        await generateSummary();
      } catch (err) {
        console.error("Failed to auto-generate summary on end:", err);
      }
    }

    if (sessionId) {
      await supabase
        .from("live_sessions" as any)
        .update({ status: "ended", ended_at: new Date().toISOString() } as any)
        .eq("id", sessionId);
    }
  }, [disconnect, generateSummary, sessionId]);

  // Auto-connect/disconnect based on isActive
  useEffect(() => {
    if (isActive) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [isActive]);

  // Load existing session data on mount
  useEffect(() => {
    if (!sessionId) return;
    const loadExisting = async () => {
      const { data } = await supabase
        .from("live_sessions" as any)
        .select("*")
        .eq("id", sessionId)
        .single();

      if (data) {
        const d = data as any;
        if (d.transcript_entries?.length) setTranscriptEntries(d.transcript_entries);
        if (d.summaries?.length) {
          setSummaries(d.summaries);
          hasSummarizedRef.current = true;
        }
        if (d.subtopics?.length) setSubtopics(d.subtopics);
      }
    };
    loadExisting();
  }, [sessionId]);

  return {
    transcriptEntries,
    summaries,
    subtopics,
    interimText,
    isConnected,
    micError,
    connectionError,
    isSummarizing,
    connect,
    disconnect,
    generateSummary,
    endSession,
  };
}
