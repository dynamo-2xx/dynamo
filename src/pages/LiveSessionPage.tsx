import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Radio, Loader2, ChevronDown } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SessionRecordView from "@/components/live/SessionRecordView";
import TranscriptCard from "@/components/debate/TranscriptCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useLiveTranscription, LiveTranscriptEntry } from "@/hooks/useLiveTranscription";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { groupConsecutiveEntries } from "@/utils/groupTranscriptEntries";

type SessionPhase = "setup" | "recording" | "ended";

const LiveSessionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [phase, setPhase] = useState<SessionPhase>(id ? "recording" : "setup");
  const [sessionId, setSessionId] = useState<string | null>(id || null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"single_device" | "multi_device">("single_device");
  const [sessionStatus, setSessionStatus] = useState<string>("recording");
  const [sessionData, setSessionData] = useState<any>(null);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    transcriptEntries,
    summaries,
    subtopics,
    interimText,
    isConnected,
    micError,
    connectionError,
    isSummarizing,
    endSession,
  } = useLiveTranscription({
    sessionId,
    isActive: phase === "recording" && sessionStatus === "recording",
  });

  // Load existing session if navigating to /live/:id
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase
        .from("live_sessions" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        const d = data as any;
        setTitle(d.title || "");
        setMode(d.mode || "single_device");
        setSessionStatus(d.status);
        setSessionData(d);
        setSpeakerNames(d.speaker_names || {});
        if (d.status === "ended") {
          setPhase("ended");
        } else {
          setPhase("recording");
        }
      }
    };
    load();
  }, [id]);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcriptEntries, interimText]);

  const handleStartSession = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("live_sessions" as any)
      .insert({
        created_by: user.id,
        title: title.trim() || null,
        mode,
        status: "recording",
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to create session");
      return;
    }

    const d = data as any;
    setSessionId(d.id);
    setSessionStatus("recording");
    setPhase("recording");
    navigate(`/live/${d.id}`, { replace: true });
  }, [user, title, mode, navigate]);

  const handleEndSession = useCallback(async () => {
    await endSession();
    setSessionStatus("ended");
    if (sessionId) {
      const { data } = await supabase
        .from("live_sessions" as any)
        .select("*")
        .eq("id", sessionId)
        .single();
      if (data) setSessionData(data);
    }
    setPhase("ended");
  }, [endSession, sessionId]);

  // Group entries by subtopic for the recording view
  const groupedEntries = useMemo(() => {
    const groups: Record<string, LiveTranscriptEntry[]> = {};
    const uncategorized: LiveTranscriptEntry[] = [];

    transcriptEntries.forEach((e) => {
      if (e.subtopic) {
        if (!groups[e.subtopic]) groups[e.subtopic] = [];
        groups[e.subtopic].push(e);
      } else {
        uncategorized.push(e);
      }
    });

    // Ordered subtopics from AI + any from entries
    const ordered = [...subtopics];
    Object.keys(groups).forEach((s) => {
      if (!ordered.includes(s)) ordered.push(s);
    });

    return { groups, uncategorized, ordered };
  }, [transcriptEntries, subtopics]);

  const getSpeakerName = (speakerId: number) => {
    return speakerNames[String(speakerId)] || `Speaker ${speakerId + 1}`;
  };

  // ── ENDED → Full record page ──
  if (phase === "ended") {
    const sd = sessionData || {};
    return (
      <AppLayout>
        <SessionRecordView
          sessionId={sessionId || ""}
          title={sd.title || title || "Live Session"}
          createdAt={sd.created_at || new Date().toISOString()}
          endedAt={sd.ended_at}
          transcriptEntries={transcriptEntries.length > 0 ? transcriptEntries : (sd.transcript_entries || [])}
          summaries={summaries.length > 0 ? summaries : (sd.summaries || [])}
          subtopics={subtopics.length > 0 ? subtopics : (sd.subtopics || [])}
          speakerNames={speakerNames}
          shareToken={sd.share_token || null}
          onEntriesUpdate={() => {}}
          onSpeakerNamesUpdate={setSpeakerNames}
        />
      </AppLayout>
    );
  }

  // ── SETUP SCREEN ──
  if (phase === "setup") {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-display font-bold mb-6">Start a Live Session</h1>

            <div className="space-y-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">
                  Title (optional)
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Team standup, Strategy meeting..."
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none font-display"
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">
                  Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("single_device")}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors border ${
                      mode === "single_device"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 text-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    <Mic className="w-4 h-4 mx-auto mb-1" />
                    In-Person
                  </button>
                  <button
                    onClick={() => setMode("multi_device")}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors border ${
                      mode === "multi_device"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 text-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    <Radio className="w-4 h-4 mx-auto mb-1" />
                    Online
                  </button>
                </div>
              </div>

              <button
                onClick={handleStartSession}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Start Recording
              </button>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // ── RECORDING SCREEN ──
  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              Recording
            </span>
            <h1 className="font-display font-bold text-lg truncate">
              {title || "Live Session"}
            </h1>
            {isSummarizing && (
              <span className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing…
              </span>
            )}
          </div>
          <button
            onClick={handleEndSession}
            className="flex items-center gap-1.5 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Square className="w-3.5 h-3.5" />
            End
          </button>
        </div>

        {/* Subtopic-grouped transcript cards */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {micError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
              {micError}
            </div>
          )}
          {connectionError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
              {connectionError}
            </div>
          )}

          {transcriptEntries.length === 0 && !interimText && (
            <div className="text-center text-muted-foreground text-sm py-12">
              {isConnected ? "Listening... Start speaking." : "Connecting to microphone..."}
            </div>
          )}

          {/* Subtopic sections */}
          {groupedEntries.ordered.map((topic) => {
            const topicEntries = groupedEntries.groups[topic] || [];
            if (topicEntries.length === 0) return null;

            return (
              <Collapsible key={topic} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-accent/50 transition-colors">
                  <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                  <h3 className="text-sm font-display font-semibold text-foreground flex-1 truncate">
                    {topic}
                  </h3>
                  <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                    {topicEntries.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2 pl-2">
                    {topicEntries.map((entry) => (
                      <TranscriptCard
                        key={entry.id}
                        speakerSide={getSpeakerName(entry.speaker_id)}
                        sideOrder={entry.speaker_id % 2}
                        text={entry.text}
                        aiSummary={entry.ai_summary}
                        timestamp={entry.timestamp}
                        autoFlip
                        compact
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Uncategorized entries */}
          {groupedEntries.uncategorized.length > 0 && (
            <div className="space-y-2">
              {groupedEntries.ordered.length > 0 && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Uncategorized
                </h3>
              )}
              {groupedEntries.uncategorized.map((entry) => (
                <TranscriptCard
                  key={entry.id}
                  speakerSide={getSpeakerName(entry.speaker_id)}
                  sideOrder={entry.speaker_id % 2}
                  text={entry.text}
                  aiSummary={entry.ai_summary}
                  timestamp={entry.timestamp}
                  autoFlip
                  compact
                />
              ))}
            </div>
          )}

          {/* Interim text indicator */}
          {interimText && (
            <div className="text-sm text-muted-foreground italic px-3 py-1.5">
              {interimText}...
            </div>
          )}
        </div>

        {/* Bottom Bar — simplified */}
        <div className="border-t border-border px-4 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mic className="w-3.5 h-3.5 text-primary" />
                  Connected
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default LiveSessionPage;
