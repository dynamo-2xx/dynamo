import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveTranscriptEntry {
  id: string;
  speaker_id: number;
  speaker_label: string;
  text: string;
  words?: { word: string; speaker: number }[];
  subtopic?: string;
  ai_summary?: string;
  timestamp: number;
  is_final: boolean;
  uncertain?: boolean;
}

export interface LiveSummary {
  id: string;
  text: string;
  subtopic_summaries?: Record<string, string>;
  created_at: number;
  subtopics: string[];
}

interface UseLiveTranscriptionProps {
  sessionId: string | null;
  isActive: boolean;
}

const BATCH_SIZE = 50;

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

  // Progressive auto-analysis timer refs
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartRef = useRef<number | null>(null);
  const lastAnalyzedCountRef = useRef(0);
  const isSummarizingRef = useRef(false);

  // Accumulate finals into a single statement until UtteranceEnd
  const statementBufferRef = useRef("");
  const statementSpeakerRef = useRef(0);
  const statementWordsRef = useRef<{ word: string; speaker: number }[]>([]);

  useEffect(() => { transcriptEntriesRef.current = transcriptEntries; }, [transcriptEntries]);
  useEffect(() => { summariesRef.current = summaries; }, [summaries]);
  useEffect(() => { subtopicsRef.current = subtopics; }, [subtopics]);
  useEffect(() => { isSummarizingRef.current = isSummarizing; }, [isSummarizing]);

  const persistSession = useCallback(async (updates: Record<string, any>) => {
    if (!sessionId) return;
    await supabase
      .from("live_sessions" as any)
      .update(updates as any)
      .eq("id", sessionId);
  }, [sessionId]);

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

  // ── Two-pass analysis ──
  const runAnalysis = useCallback(async () => {
    const entries = transcriptEntriesRef.current;
    if (!entries.length || isSummarizingRef.current) {
      console.log("[Analysis] Skipped: entries=", entries.length, "summarizing=", isSummarizingRef.current);
      return;
    }

    // Skip if no new entries since last run
    if (entries.length <= lastAnalyzedCountRef.current) {
      console.log("[Analysis] Skipped: no new entries since last run");
      return;
    }

    setIsSummarizing(true);

    try {
      // Pass 1: Classify — get subtopics and entry assignments
      const { data, error } = await supabase.functions.invoke("analyze-transcript", {
        body: {
          mode: "live_conversation",
          fullTranscript: entries.map((e) => ({
            id: e.id,
            speaker: e.speaker_label,
            text: e.text,
          })),
          previous_subtopics: subtopicsRef.current.length > 0 ? subtopicsRef.current : undefined,
        },
      });

      if (error || !data) {
        console.error("Pass 1 (classify) failed:", error);
        return;
      }

      const identifiedSubtopics: string[] = data.subtopics || [];
      const entrySubtopicMap: Record<string, string> = data.entry_subtopic_map || {};

      // Update subtopics
      if (identifiedSubtopics.length) {
        setSubtopics(identifiedSubtopics);
        persistSession({ subtopics: identifiedSubtopics });
      }

      // Find entries that need summaries (no ai_summary yet, or subtopic changed)
      const entriesNeedingSummary: { id: string; speaker: string; text: string }[] = [];
      const currentEntries = transcriptEntriesRef.current;

      for (const e of currentEntries) {
        const newSubtopic = entrySubtopicMap[e.id];
        const subtopicChanged = newSubtopic && newSubtopic !== e.subtopic;
        if (!e.ai_summary || subtopicChanged) {
          entriesNeedingSummary.push({ id: e.id, speaker: e.speaker_label, text: e.text });
        }
      }

      // Pass 2: Batch per-entry summaries
      const allEntrySummaries: Record<string, string> = {};

      if (entriesNeedingSummary.length > 0) {
        const batches: { id: string; speaker: string; text: string }[][] = [];
        for (let i = 0; i < entriesNeedingSummary.length; i += BATCH_SIZE) {
          batches.push(entriesNeedingSummary.slice(i, i + BATCH_SIZE));
        }

        const batchResults = await Promise.all(
          batches.map(async (batch) => {
            try {
              const { data: sumData, error: sumError } = await supabase.functions.invoke("analyze-transcript", {
                body: { mode: "live_summarize_entries", entries: batch },
              });
              if (!sumError && sumData?.entry_summaries) {
                return sumData.entry_summaries as Record<string, string>;
              }
            } catch (err) {
              console.error("Pass 2 batch failed:", err);
            }
            return {};
          })
        );

        for (const batch of batchResults) {
          Object.assign(allEntrySummaries, batch);
        }
      }

      // Apply all results to entries
      setTranscriptEntries((prev) => {
        const updated = prev.map((e) => ({
          ...e,
          subtopic: entrySubtopicMap[e.id] || e.subtopic,
          ai_summary: allEntrySummaries[e.id] || e.ai_summary,
        }));
        persistSession({ transcript_entries: updated });
        return updated;
      });

      lastAnalyzedCountRef.current = entries.length;
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsSummarizing(false);
    }
  }, [persistSession]);

  // ── Progressive timer: schedule next analysis tick ──
  const scheduleNextAnalysis = useCallback(() => {
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    if (!recordingStartRef.current) return;

    const elapsedSeconds = (Date.now() - recordingStartRef.current) / 1000;
    const interval = (30 + Math.floor(elapsedSeconds / 30) * 5) * 1000;

    analysisTimerRef.current = setTimeout(async () => {
      await runAnalysis();
      // Schedule next tick after this one completes
      scheduleNextAnalysis();
    }, interval);
  }, [runAnalysis]);

  // Start/stop the progressive timer when recording state changes
  useEffect(() => {
    if (isActive && isConnected) {
      if (!recordingStartRef.current) {
        recordingStartRef.current = Date.now();
      }
      scheduleNextAnalysis();
    } else {
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
    }

    return () => {
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
    };
  }, [isActive, isConnected, scheduleNextAnalysis]);

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
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            if (rms < 0.008) return;

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
              const words = alt.words || [];
              if (words.length === 0) {
                const speaker = 0;
                if (statementBufferRef.current && statementSpeakerRef.current !== speaker) {
                  flushStatement();
                }
                statementSpeakerRef.current = speaker;
                statementBufferRef.current += (statementBufferRef.current ? " " : "") + transcript;
                flushStatement();
              } else {
                let currentSpeaker = words[0].speaker ?? 0;
                let currentWords: string[] = [];

                for (const word of words) {
                  const wordSpeaker = word.speaker ?? 0;
                  if (wordSpeaker !== currentSpeaker) {
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

                if (currentWords.length > 0) {
                  if (statementBufferRef.current && statementSpeakerRef.current !== currentSpeaker) {
                    flushStatement();
                  }
                  statementSpeakerRef.current = currentSpeaker;
                  statementBufferRef.current += (statementBufferRef.current ? " " : "") + currentWords.join(" ");
                }
              }
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

  const endSession = useCallback(async () => {
    // Stop the auto-analysis timer
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    disconnect();

    // Run a final analysis pass
    if (transcriptEntriesRef.current.length > 0) {
      try {
        await runAnalysis();
      } catch (err) {
        console.error("Failed to run final analysis:", err);
      }
    }

    if (sessionId) {
      await supabase
        .from("live_sessions" as any)
        .update({ status: "ended", ended_at: new Date().toISOString() } as any)
        .eq("id", sessionId);
    }
  }, [disconnect, runAnalysis, sessionId]);

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
        if (d.summaries?.length) setSummaries(d.summaries);
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
    endSession,
  };
}
