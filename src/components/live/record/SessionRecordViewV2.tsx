import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Share2, Check, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  LiveTranscriptEntry,
  LiveSummary,
  LiveThreadMeta,
} from "@/hooks/useLiveTranscription";
import TagPicker from "@/components/tags/TagPicker";
import ThreadedRecordPane from "./ThreadedRecordPane";
import TranscriptPane from "./TranscriptPane";
import RecordQAChat from "@/components/live/RecordQAChat";
import NotebookPanel from "./NotebookPanel";
import HighlightAnnotateLayer from "./HighlightAnnotateLayer";
import { useSessionNotebook } from "@/hooks/useSessionNotebook";
import { useSessionAnnotations } from "@/hooks/useSessionAnnotations";
import { useSessionCitations } from "@/hooks/useSessionCitations";
import { useSessionCrossRefs } from "@/hooks/useSessionCrossRefs";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  sessionId: string;
  title: string;
  createdAt: string;
  endedAt: string | null;
  transcriptEntries: LiveTranscriptEntry[];
  summaries: LiveSummary[];
  subtopics: string[];
  speakerNames: Record<string, string>;
  shareToken: string | null;
  readOnly?: boolean;
  threadTitles?: Record<string, LiveThreadMeta>;
  onEntriesUpdate?: (entries: LiveTranscriptEntry[]) => void;
  onSpeakerNamesUpdate?: (names: Record<string, string>) => void;
}

/**
 * Post-session record, redesigned as a study-first split-pane:
 * left = hierarchical Threaded Record, right = Full Transcript.
 * Floating Q&A button stays managed by the parent page.
 */
const SessionRecordViewV2 = ({
  sessionId,
  title,
  createdAt,
  endedAt,
  transcriptEntries,
  summaries,
  subtopics,
  speakerNames,
  shareToken,
  readOnly = false,
  threadTitles: threadTitlesProp,
  onEntriesUpdate,
  onSpeakerNamesUpdate,
}: Props) => {
  const [currentShareToken, setCurrentShareToken] = useState(shareToken);
  const [isSharing, setIsSharing] = useState(false);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const recordRootRef = useRef<HTMLDivElement>(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"threads" | "transcript">("threads");
  const location = useLocation();
  const { user } = useAuth();

  // Study tools: notebook, annotations, citations, AI cross-refs.
  const notebook = useSessionNotebook(sessionId);
  const annotationsHook = useSessionAnnotations(sessionId);
  const citations = useSessionCitations(sessionId);
  const crossRefs = useSessionCrossRefs(sessionId);

  // Determine if current viewer is the host (owner of the session).
  const [isHost, setIsHost] = useState(false);
  useEffect(() => {
    if (!user || readOnly) {
      setIsHost(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("created_by")
        .eq("id", sessionId)
        .maybeSingle();
      if (!cancelled) setIsHost(data?.created_by === user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, user, readOnly]);

  const threadTitles: Record<string, LiveThreadMeta> =
    threadTitlesProp && Object.keys(threadTitlesProp).length > 0
      ? threadTitlesProp
      : ((summaries as any[]).find((s) => s?.id === "__threads_meta__")?.thread_titles ||
          {}) as Record<string, LiveThreadMeta>;

  const duration =
    endedAt && createdAt
      ? Math.round((new Date(endedAt).getTime() - new Date(createdAt).getTime()) / 60000)
      : null;

  const getSpeakerName = useCallback(
    (speakerId: number) =>
      speakerNames[String(speakerId)] || `Speaker ${speakerId + 1}`,
    [speakerNames],
  );

  // Jump-to-transcript: scroll the right pane to the first cited entry and flash all cited.
  const handleJumpToTranscript = useCallback((entryIds: string[]) => {
    if (entryIds.length === 0) return;
    const root = transcriptScrollRef.current;
    const target = root?.querySelector<HTMLElement>(`[data-entry-id="${entryIds[0]}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    entryIds.forEach((id) => {
      const el = root?.querySelector<HTMLElement>(`[data-entry-id="${id}"]`);
      if (!el) return;
      el.classList.add("transcript-flash");
      window.setTimeout(() => el.classList.remove("transcript-flash"), 900);
    });
  }, []);

  const handleRenameSpeaker = useCallback(
    async (speakerId: number, newName: string) => {
      if (readOnly) return;
      const updated = { ...speakerNames, [String(speakerId)]: newName };
      onSpeakerNamesUpdate?.(updated);
      await supabase
        .from("live_sessions" as any)
        .update({ speaker_names: updated } as any)
        .eq("id", sessionId);
    },
    [speakerNames, sessionId, readOnly, onSpeakerNamesUpdate],
  );

  const handleSplitEntry = useCallback(
    async (entryId: string, splitIndex: number) => {
      if (readOnly) return;
      const entry = transcriptEntries.find((e) => e.id === entryId);
      if (!entry?.words || splitIndex <= 0 || splitIndex >= entry.words.length) return;

      const firstWords = entry.words.slice(0, splitIndex);
      const secondWords = entry.words.slice(splitIndex);
      const firstSpeaker = firstWords[0]?.speaker ?? entry.speaker_id;
      const secondSpeaker = secondWords[0]?.speaker ?? entry.speaker_id;

      const a: LiveTranscriptEntry = {
        ...entry,
        id: `${entry.id}-a`,
        text: firstWords.map((w) => w.word).join(" "),
        words: firstWords,
        speaker_id: firstSpeaker,
        speaker_label: getSpeakerName(firstSpeaker),
      };
      const b: LiveTranscriptEntry = {
        ...entry,
        id: `${entry.id}-b`,
        text: secondWords.map((w) => w.word).join(" "),
        words: secondWords,
        speaker_id: secondSpeaker,
        speaker_label: getSpeakerName(secondSpeaker),
        uncertain: false,
      };
      const updated = transcriptEntries.flatMap((e) => (e.id === entryId ? [a, b] : [e]));
      onEntriesUpdate?.(updated);
      await supabase
        .from("live_sessions" as any)
        .update({ transcript_entries: updated } as any)
        .eq("id", sessionId);
    },
    [transcriptEntries, sessionId, readOnly, onEntriesUpdate, getSpeakerName],
  );

  const handleMergeEntry = useCallback(
    async (entryId: string) => {
      if (readOnly) return;
      const idx = transcriptEntries.findIndex((e) => e.id === entryId);
      if (idx <= 0) return;
      const prev = transcriptEntries[idx - 1];
      const curr = transcriptEntries[idx];
      const merged: LiveTranscriptEntry = {
        ...prev,
        text: prev.text + " " + curr.text,
        words: [...(prev.words || []), ...(curr.words || [])],
        uncertain: false,
      };
      const updated = transcriptEntries
        .filter((_, i) => i !== idx)
        .map((e) => (e.id === prev.id ? merged : e));
      onEntriesUpdate?.(updated);
      await supabase
        .from("live_sessions" as any)
        .update({ transcript_entries: updated } as any)
        .eq("id", sessionId);
    },
    [transcriptEntries, sessionId, readOnly, onEntriesUpdate],
  );

  const handleShare = useCallback(async () => {
    if (currentShareToken) {
      const url = `${window.location.origin}/live/shared/${currentShareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
      return;
    }
    setIsSharing(true);
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await supabase
      .from("live_sessions" as any)
      .update({ share_token: token } as any)
      .eq("id", sessionId);
    if (error) {
      toast.error("Failed to create share link");
    } else {
      setCurrentShareToken(token);
      const url = `${window.location.origin}/live/shared/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    }
    setIsSharing(false);
  }, [currentShareToken, sessionId]);

  // Consolidate notebook → "My Take" when the user navigates away from this session.
  const consolidatedRef = useRef(false);
  const triggerConsolidate = useCallback(async () => {
    if (consolidatedRef.current) return;
    if (!user || readOnly) return;
    if (!notebook.thoughts.trim() && annotationsHook.annotations.length === 0) return;
    consolidatedRef.current = true;
    try {
      await notebook.flushNow();
      await supabase.functions.invoke("consolidate-notebook", {
        body: { session_id: sessionId },
      });
    } catch (e) {
      console.error("consolidate-notebook failed", e);
    }
  }, [user, readOnly, notebook, annotationsHook.annotations.length, sessionId]);

  // Fire on route change away from this page, and on tab close.
  useEffect(() => {
    const onBeforeUnload = () => {
      // Best-effort flush; consolidation continues server-side via invoke.
      void triggerConsolidate();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void triggerConsolidate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Jump to the source of an annotation (summary node or transcript entry).
  const jumpToAnnotation = useCallback((a: { node_kind: string; node_id: string }) => {
    if (a.node_kind === "transcript") {
      handleJumpToTranscript([a.node_id]);
      return;
    }
    const el = recordRootRef.current?.querySelector<HTMLElement>(
      `[data-summary-node-id="${a.node_id}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("transcript-flash");
      window.setTimeout(() => el.classList.remove("transcript-flash"), 900);
    }
  }, [handleJumpToTranscript]);

  // Cross-ref jump: scroll to either summary or transcript node id.
  const jumpToCrossRef = useCallback((toNodeId: string) => {
    const el = recordRootRef.current?.querySelector<HTMLElement>(
      `[data-summary-node-id="${toNodeId}"], [data-entry-id="${toNodeId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("transcript-flash");
      window.setTimeout(() => el.classList.remove("transcript-flash"), 900);
    } else {
      handleJumpToTranscript([toNodeId]);
    }
  }, [handleJumpToTranscript]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header — Main Topic */}
        <div className="flex items-center gap-3 mb-2">
          {!readOnly && (
            <Link
              to="/my-debates?tab=live"
              className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <h1 className="text-3xl md:text-4xl font-display text-foreground antialiased leading-tight truncate">
            {title || "Live Session"}
          </h1>
        </div>

        <div className="flex items-center flex-wrap gap-3 mb-6 text-sm text-muted-foreground font-body">
          <span>{new Date(createdAt).toLocaleDateString()}</span>
          {duration !== null && <span>· {duration} min</span>}
          <span>·</span>
          <span className="text-xs uppercase tracking-wider">Ended</span>
          {!readOnly && (
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium border border-foreground/10 px-3 py-1.5 rounded-full hover:bg-foreground/[0.04] transition-colors disabled:opacity-50"
            >
              {currentShareToken ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {currentShareToken ? "Copy link" : "Share"}
            </button>
          )}
        </div>

        {!readOnly && (
          <div className="mb-6">
            <TagPicker kind="live_session" recordId={sessionId} max={5} compact />
          </div>
        )}

        {/* Split-pane: Threaded Record | Full Transcript */}
        {/* Mobile (<768px): single column with toggle pill (Step 11). For now, stack. */}
        <div className="md:hidden space-y-6">
          <section>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 px-2">
              Threaded record
            </h2>
            <ThreadedRecordPane
              transcriptEntries={transcriptEntries}
              subtopics={subtopics}
              threadTitles={threadTitles}
              summaries={summaries}
              getSpeakerName={getSpeakerName}
              onJumpToTranscript={handleJumpToTranscript}
            />
          </section>
          <section>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 px-2">
              Full transcript
            </h2>
            <TranscriptPane
              ref={transcriptScrollRef}
              entries={transcriptEntries}
              getSpeakerName={getSpeakerName}
              readOnly={readOnly}
              onRenameSpeaker={handleRenameSpeaker}
              onSplit={handleSplitEntry}
              onMerge={handleMergeEntry}
            />
          </section>
        </div>

        <div className="hidden md:block">
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[60vh] rounded-lg border border-foreground/10"
          >
            <ResizablePanel defaultSize={55} minSize={30}>
              <div className="h-[70vh] overflow-y-auto p-3">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 px-1">
                  Threaded record
                </h2>
                <ThreadedRecordPane
                  transcriptEntries={transcriptEntries}
                  subtopics={subtopics}
                  threadTitles={threadTitles}
                  summaries={summaries}
                  getSpeakerName={getSpeakerName}
                  onJumpToTranscript={handleJumpToTranscript}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-foreground/10" />
            <ResizablePanel defaultSize={45} minSize={25}>
              <div className="h-[70vh] overflow-y-auto p-3">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 px-1">
                  Full transcript
                </h2>
                <TranscriptPane
                  ref={transcriptScrollRef}
                  entries={transcriptEntries}
                  getSpeakerName={getSpeakerName}
                  readOnly={readOnly}
                  onRenameSpeaker={handleRenameSpeaker}
                  onSplit={handleSplitEntry}
                  onMerge={handleMergeEntry}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {transcriptEntries.length === 0 && summaries.length === 0 && (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No transcript entries recorded.
          </p>
        )}
      </motion.div>

      <RecordQAChat
        sessionId={sessionId}
        transcriptEntries={transcriptEntries}
        subtopics={subtopics}
        summaries={summaries}
        speakerNames={speakerNames}
        shareToken={currentShareToken}
      />
    </div>
  );
};

export { SessionRecordViewV2 };
export default SessionRecordViewV2;