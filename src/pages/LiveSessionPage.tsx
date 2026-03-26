import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, FileText, ChevronDown, ChevronUp, Radio } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SessionRecordView from "@/components/live/SessionRecordView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useLiveTranscription, LiveTranscriptEntry } from "@/hooks/useLiveTranscription";

type SessionPhase = "setup" | "recording" | "ended";

const LiveSessionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [phase, setPhase] = useState<SessionPhase>(id ? "recording" : "setup");
  const [sessionId, setSessionId] = useState<string | null>(id || null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"single_device" | "multi_device">("single_device");
  const [summaryOpen, setSummaryOpen] = useState(false);
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
    generateSummary,
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
    // Reload session data for the record view
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

  const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;

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
          </div>
          <button
            onClick={handleEndSession}
            className="flex items-center gap-1.5 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Square className="w-3.5 h-3.5" />
            End
          </button>
        </div>

        {/* Transcript Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {micError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-3">
              {micError}
            </div>
          )}
          {connectionError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-3">
              {connectionError}
            </div>
          )}

          {transcriptEntries.map((entry) => (
            <TranscriptBubble key={entry.id} entry={entry} speakerNames={speakerNames} />
          ))}

          {interimText && (
            <div className="text-sm text-muted-foreground italic px-3 py-1.5">
              {interimText}...
            </div>
          )}

          {transcriptEntries.length === 0 && !interimText && (
            <div className="text-center text-muted-foreground text-sm py-12">
              {isConnected ? "Listening... Start speaking." : "Connecting to microphone..."}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border px-4 py-3 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mic className="w-3.5 h-3.5 text-primary" />
                  Connected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generateSummary}
                disabled={isSummarizing || transcriptEntries.length === 0}
                className="flex items-center gap-1.5 bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-secondary/80 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {isSummarizing ? "Summarizing..." : "Generate Summary"}
              </button>
              {latestSummary && (
                <button
                  onClick={() => setSummaryOpen(!summaryOpen)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {summaryOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {summaryOpen && latestSummary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-card border border-border rounded-xl p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">
                    Latest Summary ({summaries.length} total)
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{latestSummary.text}</p>
                  {latestSummary.subtopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {latestSummary.subtopics.map((s) => (
                        <span key={s} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

// Simple bubble for recording view (no edit tools)
const TranscriptBubble = ({
  entry,
  speakerNames,
}: {
  entry: LiveTranscriptEntry;
  speakerNames: Record<string, string>;
}) => {
  const isLeft = entry.speaker_id % 2 === 0;
  const name = speakerNames[String(entry.speaker_id)] || entry.speaker_label;

  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"} mb-1.5`}>
      <div
        className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm ${
          isLeft
            ? "bg-secondary text-foreground rounded-bl-sm"
            : "bg-primary/10 text-foreground rounded-br-sm"
        }`}
      >
        <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
          {name}
        </span>
        <span>{entry.text}</span>
      </div>
    </div>
  );
};

export default LiveSessionPage;
