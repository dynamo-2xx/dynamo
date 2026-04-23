import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Check,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LiveTranscriptEntry,
  LiveSummary,
  LiveThreadMeta,
} from "@/hooks/useLiveTranscription";
import TagPicker from "@/components/tags/TagPicker";
import ThreadedRecordPane from "./ThreadedRecordPane";
import TranscriptPane from "./TranscriptPane";
import NotebookPanel from "./NotebookPanel";
import HighlightAnnotateLayer from "./HighlightAnnotateLayer";
import { buildHierarchy } from "./types";
import { cn } from "@/lib/utils";
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

  // Desktop record/transcript split state — persisted per session
  const SPLIT_KEY = `dynamo:record-split:${sessionId}`;
  const [recordSplit, setRecordSplit] = useState<{
    ratio: number;
    collapsed: "none" | "left" | "right";
    lastRatio: number;
  }>(() => {
    try {
      const raw = localStorage.getItem(SPLIT_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v?.ratio === "number") return v;
      }
    } catch {
      /* noop */
    }
    return { ratio: 0.55, collapsed: "none" as const, lastRatio: 0.55 };
  });
  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_KEY, JSON.stringify(recordSplit));
    } catch {
      /* noop */
    }
  }, [recordSplit, SPLIT_KEY]);

  const splitRef = useRef<HTMLDivElement>(null);
  const dragRecordSplit = useRef(false);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRecordSplit.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      let r = (e.clientX - rect.left) / rect.width;
      r = Math.min(0.85, Math.max(0.15, r));
      setRecordSplit((s) => ({ ...s, ratio: r, lastRatio: r, collapsed: "none" }));
    };
    const up = () => {
      dragRecordSplit.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

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

  /**
   * Walk up from `el`, opening every Radix Collapsible ancestor that is currently
   * closed. We open OUTERMOST first (so inner content mounts), waiting a frame
   * between clicks because Radix only mounts CollapsibleContent on open.
   * After expansion, the caller should re-query the DOM for the now-mounted
   * target node.
   */
  const expandAncestors = async (rootSelector: string, targetSelector: string) => {
    const root = recordRootRef.current;
    if (!root) return;
    // Loop: keep finding closed ancestors of the target (which may be re-mounted
    // each time) and click their triggers.
    for (let i = 0; i < 6; i++) {
      const target = root.querySelector<HTMLElement>(targetSelector);
      if (target) {
        // Check if any ancestor inside the record root is still closed.
        let closedAncestor: HTMLElement | null = null;
        let cur: HTMLElement | null = target.parentElement;
        while (cur && cur !== root) {
          if (cur.getAttribute("data-state") === "closed") closedAncestor = cur;
          cur = cur.parentElement;
        }
        if (!closedAncestor) return; // all open already
        // Find this collapsible's OWN trigger: the closest descendant button with
        // data-state="closed". Radix marks both root and trigger with data-state.
        const trigger = closedAncestor.querySelector<HTMLElement>(
          'button[data-state="closed"]',
        );
        trigger?.click();
      } else {
        // Target not mounted yet — find the deepest closed collapsible whose
        // descendants might contain it (by id substring) and open it. Fallback:
        // open every closed collapsible inside the root.
        const allClosed = Array.from(
          root.querySelectorAll<HTMLElement>('[data-state="closed"]'),
        ).filter((n) => n.tagName !== "BUTTON");
        if (allClosed.length === 0) return;
        // Open the outermost one first.
        const outermost = allClosed[0];
        const trigger = outermost.querySelector<HTMLElement>('button[data-state="closed"]');
        trigger?.click();
      }
      // Wait one animation frame so Radix mounts the newly-opened content.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  };
  // Suppress unused-var lint (rootSelector kept for possible future scoping).
  void expandAncestors;

  /** Force both record/transcript panes to be visible side-by-side. */
  const ensureBothPanesOpen = useCallback(() => {
    setRecordSplit((s) => (s.collapsed === "none" ? s : { ...s, collapsed: "none" }));
  }, []);

  const flashEl = (el: HTMLElement) => {
    el.classList.add("transcript-flash");
    window.setTimeout(() => el.classList.remove("transcript-flash"), 1200);
  };

  // Build entry → summary node lookup so a transcript annotation can also reveal the
  // matching argument summary in the threaded record pane.
  const summaryNodeByEntryId = useMemo(() => {
    const map = new Map<string, string>();
    const hierarchy = buildHierarchy({
      transcriptEntries,
      subtopics,
      threadTitles,
      summaries,
      getSpeakerName,
    });
    hierarchy.forEach((sub) =>
      sub.threads.forEach((th) =>
        th.summaries.forEach((s) =>
          s.source_entry_ids.forEach((eid) => map.set(eid, s.node_id)),
        ),
      ),
    );
    return map;
  }, [transcriptEntries, subtopics, threadTitles, summaries, getSpeakerName]);

  const summaryByNodeId = useMemo(() => {
    const map = new Map<string, { source_entry_ids: string[] }>();
    const hierarchy = buildHierarchy({
      transcriptEntries,
      subtopics,
      threadTitles,
      summaries,
      getSpeakerName,
    });
    hierarchy.forEach((sub) =>
      sub.threads.forEach((th) =>
        th.summaries.forEach((s) => map.set(s.node_id, { source_entry_ids: s.source_entry_ids })),
      ),
    );
    return map;
  }, [transcriptEntries, subtopics, threadTitles, summaries, getSpeakerName]);

  /**
   * Reveal a summary node inside the (possibly collapsed) threaded record pane:
   * make sure the pane is open, expand all ancestor Collapsibles, then scroll/flash.
   */
  const revealSummaryNode = useCallback(
    (nodeId: string) => {
      ensureBothPanesOpen();
      // Defer one frame so the pane has mounted if it was just expanded.
      window.setTimeout(async () => {
        const sel = `[data-summary-node-id="${nodeId}"]`;
        // Open every closed ancestor collapsible so the summary becomes visible.
        await expandAncestors(sel, sel);
        // Re-query — the element may have been (re)mounted by Radix.
        const el = recordRootRef.current?.querySelector<HTMLElement>(sel);
        if (!el) return;
        // Allow one more frame for the open animation to settle.
        window.setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          flashEl(el);
        }, 220);
      }, 60);
    },
    [ensureBothPanesOpen],
  );

  /**
   * Reveal one or more transcript entries in the right pane and flash them.
   * Transcript entries are not collapsed, so just scroll + flash.
   */
  const revealTranscriptEntries = useCallback(
    (entryIds: string[]) => {
      if (entryIds.length === 0) return;
      ensureBothPanesOpen();
      window.setTimeout(() => {
        const root = transcriptScrollRef.current;
        const target = root?.querySelector<HTMLElement>(`[data-entry-id="${entryIds[0]}"]`);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
        entryIds.forEach((id) => {
          const el = root?.querySelector<HTMLElement>(`[data-entry-id="${id}"]`);
          if (el) flashEl(el);
        });
      }, 60);
    },
    [ensureBothPanesOpen],
  );

  // Jump-to-transcript from the threaded record (e.g. "View transcript" button).
  // Also makes sure the right pane is visible.
  const handleJumpToTranscript = useCallback(
    (entryIds: string[]) => {
      revealTranscriptEntries(entryIds);
    },
    [revealTranscriptEntries],
  );

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

  /**
   * Jump to the source of an annotation (summary node or transcript entry).
   * Always reveals BOTH panes so the user sees the source in the threaded
   * record AND the parallel transcript at the same time.
   */
  const jumpToAnnotation = useCallback(
    (a: { node_kind: string; node_id: string }) => {
      if (a.node_kind === "transcript") {
        // Reveal the entry in transcript pane.
        revealTranscriptEntries([a.node_id]);
        // Also surface the matching summary node in the threaded record.
        const summaryNodeId = summaryNodeByEntryId.get(a.node_id);
        if (summaryNodeId) revealSummaryNode(summaryNodeId);
        return;
      }
      // Summary node: open it in threaded record AND scroll its source entries
      // into view in the transcript pane.
      revealSummaryNode(a.node_id);
      const sourceIds = summaryByNodeId.get(a.node_id)?.source_entry_ids || [];
      if (sourceIds.length > 0) revealTranscriptEntries(sourceIds);
    },
    [revealTranscriptEntries, revealSummaryNode, summaryNodeByEntryId, summaryByNodeId],
  );

  // Cross-ref jump: scroll to either summary or transcript node id, also revealing
  // ancestor collapsibles when the target is a summary node.
  const jumpToCrossRef = useCallback(
    (toNodeId: string) => {
      if (summaryByNodeId.has(toNodeId)) {
        revealSummaryNode(toNodeId);
        const sourceIds = summaryByNodeId.get(toNodeId)?.source_entry_ids || [];
        if (sourceIds.length > 0) revealTranscriptEntries(sourceIds);
        return;
      }
      revealTranscriptEntries([toNodeId]);
      const summaryNodeId = summaryNodeByEntryId.get(toNodeId);
      if (summaryNodeId) revealSummaryNode(summaryNodeId);
    },
    [revealTranscriptEntries, revealSummaryNode, summaryNodeByEntryId, summaryByNodeId],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10" ref={recordRootRef} data-record-root>
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

        {/* Mobile (<768px): single column with toggle pill */}
        <div className="md:hidden">
          <div className="inline-flex items-center gap-1 p-1 mb-4 rounded-full border border-foreground/10 bg-background">
            {(["threads", "transcript"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMobileTab(t)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  mobileTab === t
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "threads" ? "Threads" : "Transcript"}
              </button>
            ))}
          </div>
          {mobileTab === "threads" ? (
            <ThreadedRecordPane
              transcriptEntries={transcriptEntries}
              subtopics={subtopics}
              threadTitles={threadTitles}
              summaries={summaries}
              getSpeakerName={getSpeakerName}
              onJumpToTranscript={(ids) => {
                handleJumpToTranscript(ids);
                setMobileTab("transcript");
              }}
              isHost={isHost}
              citationByNode={citations.byNode}
              onSaveCitation={(node, text, url) => {
                void citations.upsert(node, text, url);
              }}
              onDeleteCitation={(node) => {
                const c = citations.byNode(node);
                if (c) void citations.remove(c.id);
              }}
              refsByNode={crossRefs.refsByNode}
              numberByRefId={crossRefs.numberByRefId}
              onJumpToCrossRef={jumpToCrossRef}
            />
          ) : (
            <TranscriptPane
              ref={transcriptScrollRef}
              entries={transcriptEntries}
              getSpeakerName={getSpeakerName}
              readOnly={readOnly}
              onRenameSpeaker={handleRenameSpeaker}
              onSplit={handleSplitEntry}
              onMerge={handleMergeEntry}
            />
          )}
        </div>

        <div className="hidden md:block">
          {(() => {
            const leftCollapsed = recordSplit.collapsed === "left";
            const rightCollapsed = recordSplit.collapsed === "right";
            const leftPct = leftCollapsed ? 0 : rightCollapsed ? 100 : recordSplit.ratio * 100;
            const rightPct = 100 - leftPct;
            const expand = (side: "left" | "right") =>
              setRecordSplit((s) => ({
                ...s,
                collapsed: "none",
                ratio: s.lastRatio || 0.55,
              }));
            const collapse = (side: "left" | "right") =>
              setRecordSplit((s) => ({
                ...s,
                lastRatio: s.collapsed === "none" ? s.ratio : s.lastRatio,
                collapsed: side,
              }));
            return (
              <div
                ref={splitRef}
                className="relative flex min-h-[60vh] rounded-lg border border-foreground/10 overflow-hidden"
              >
                {/* Left rail when threaded record is collapsed */}
                {leftCollapsed && (
                  <button
                    type="button"
                    onClick={() => expand("left")}
                    className="absolute left-0 top-0 bottom-0 w-7 z-10 bg-background border-r border-foreground/10 hover:bg-foreground/[0.03] transition-colors flex flex-col items-center justify-center gap-2 group"
                    aria-label="Expand threaded record"
                    title="Expand threaded record"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span
                      className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground"
                      style={{ writingMode: "vertical-rl" }}
                    >
                      Threaded record
                    </span>
                  </button>
                )}
                {/* Left pane */}
                <div
                  style={{ width: `${leftPct}%` }}
                  className={cn(
                    "h-[70vh] flex flex-col min-w-0 transition-[width] duration-200",
                    leftCollapsed && "pointer-events-none",
                    rightCollapsed && "pr-7",
                  )}
                >
                  {!leftCollapsed && (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
                        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Threaded record
                        </h2>
                        <button
                          type="button"
                          onClick={() => collapse("left")}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          aria-label="Collapse threaded record"
                          title="Collapse"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 min-h-0">
                        <ThreadedRecordPane
                          transcriptEntries={transcriptEntries}
                          subtopics={subtopics}
                          threadTitles={threadTitles}
                          summaries={summaries}
                          getSpeakerName={getSpeakerName}
                          onJumpToTranscript={handleJumpToTranscript}
                          isHost={isHost}
                          citationByNode={citations.byNode}
                          onSaveCitation={(node, text, url) => {
                            void citations.upsert(node, text, url);
                          }}
                          onDeleteCitation={(node) => {
                            const c = citations.byNode(node);
                            if (c) void citations.remove(c.id);
                          }}
                          refsByNode={crossRefs.refsByNode}
                          numberByRefId={crossRefs.numberByRefId}
                          onJumpToCrossRef={jumpToCrossRef}
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Drag divider — hidden when one side is collapsed */}
                {recordSplit.collapsed === "none" && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onPointerDown={(e) => {
                      dragRecordSplit.current = true;
                      (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    className="group relative w-1.5 shrink-0 cursor-col-resize bg-foreground/10 hover:bg-foreground/30 transition-colors"
                    style={{ touchAction: "none" }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                {/* Right pane */}
                <div
                  style={{ width: `${rightPct}%` }}
                  className={cn(
                    "h-[70vh] flex flex-col min-w-0 transition-[width] duration-200",
                    rightCollapsed && "pointer-events-none",
                    leftCollapsed && "pl-7",
                  )}
                >
                  {!rightCollapsed && (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
                        <button
                          type="button"
                          onClick={() => collapse("right")}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          aria-label="Collapse transcript"
                          title="Collapse"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Full transcript
                        </h2>
                        <span className="w-5" />
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 min-h-0">
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
                    </>
                  )}
                </div>
                {/* Right rail when transcript is collapsed */}
                {rightCollapsed && (
                  <button
                    type="button"
                    onClick={() => expand("right")}
                    className="absolute right-0 top-0 bottom-0 w-7 z-10 bg-background border-l border-foreground/10 hover:bg-foreground/[0.03] transition-colors flex flex-col items-center justify-center gap-2 group"
                    aria-label="Expand full transcript"
                    title="Expand full transcript"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span
                      className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground"
                      style={{ writingMode: "vertical-rl" }}
                    >
                      Full transcript
                    </span>
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {transcriptEntries.length === 0 && summaries.length === 0 && (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No transcript entries recorded.
          </p>
        )}
      </motion.div>

      {/* Highlight → annotate layer (private, owner only) */}
      {!readOnly && user && (
        <HighlightAnnotateLayer
          containerSelector="[data-record-root]"
          onAnnotate={(input) => {
            void annotationsHook.add(input);
            toast.success("Saved to notebook");
          }}
        />
      )}

      {/* Floating Notebook button (bottom-left), mirrors Q&A on the right */}
      {!readOnly && user && (
        <button
          onClick={() => setNotebookOpen((v) => !v)}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-background border border-foreground/10 shadow-sm flex items-center justify-center hover:bg-foreground/[0.04] transition-colors"
          aria-label="Open notebook"
        >
          <BookOpen className="w-5 h-5 text-foreground" />
        </button>
      )}

      {!readOnly && user && (
        <NotebookPanel
          open={notebookOpen}
          onClose={() => setNotebookOpen(false)}
          sessionId={sessionId}
          thoughts={notebook.thoughts}
          setThoughts={notebook.setThoughts}
          myTake={notebook.myTake}
          setMyTake={notebook.setMyTake}
          onDeleteMyTake={notebook.deleteMyTake}
          onPublish={notebook.publish}
          onUnpublish={notebook.unpublish}
          isPublished={notebook.isPublished}
          annotations={annotationsHook.annotations}
          onJumpToAnnotation={jumpToAnnotation}
          onRemoveAnnotation={annotationsHook.remove}
          onUpdateAnnotation={annotationsHook.update}
          transcriptEntries={transcriptEntries}
          subtopics={subtopics}
          summaries={summaries}
          speakerNames={speakerNames}
          shareToken={currentShareToken}
        />
      )}
    </div>
  );
};

export { SessionRecordViewV2 };
export default SessionRecordViewV2;