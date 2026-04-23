import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  Columns2,
  ArrowLeftRight,
  X,
  Sparkles,
  MoreHorizontal,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import AppLayout from "@/components/AppLayout";
import ShareMenu from "@/components/study/ShareMenu";
import RenameDialog from "@/components/study/RenameDialog";
import ThoughtsTab from "@/components/live/record/notebook/ThoughtsTab";
import AnnotationsTab from "@/components/live/record/notebook/AnnotationsTab";
import MyTakeTab from "@/components/live/record/notebook/MyTakeTab";
import DynamoChatPane from "@/components/live/record/DynamoChatPane";
import NotebookSplitDivider from "@/components/live/record/NotebookSplitDivider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useMyStudy, notebookTitle } from "@/hooks/useMyStudy";
import { useSessionNotebook } from "@/hooks/useSessionNotebook";
import { useSessionAnnotations } from "@/hooks/useSessionAnnotations";
import { useRecordQA } from "@/hooks/useRecordQA";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReaderNotes, type ReaderNote } from "@/hooks/useReaderNotes";
import ReaderNotesPanel from "@/components/study/ReaderNotesPanel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type {
  LiveTranscriptEntry,
  LiveSummary,
} from "@/hooks/useLiveTranscription";

type Tab = "thoughts" | "annotations" | "my_take" | "dynamo";

const TAB_LABEL: Record<Tab, string> = {
  thoughts: "Thoughts",
  annotations: "Annotations",
  my_take: "My Take",
  dynamo: "Dynamo",
};

interface SplitState {
  enabled: boolean;
  left: Tab;
  right: Tab;
  ratio: number;
}

const SPLIT_KEY = (sid: string) => `dynamo:notebook-split:${sid}`;
const loadSplit = (sid: string): SplitState | null => {
  try {
    const raw = localStorage.getItem(SPLIT_KEY(sid));
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.enabled !== "boolean") return null;
    return v;
  } catch {
    return null;
  }
};

const TabBtn = ({
  active,
  onClick,
  children,
  hasIcon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hasIcon?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "relative shrink-0 px-3 sm:px-4 pt-2 pb-2.5 text-[13px] sm:text-sm font-body rounded-t-md border border-b-0 transition-colors min-h-[44px] sm:min-h-0 whitespace-nowrap",
      active
        ? "bg-background border-border text-foreground -mb-px z-10"
        : "bg-accent/50 border-transparent text-muted-foreground hover:text-foreground",
    )}
  >
    {hasIcon && <Sparkles className="w-3 h-3 inline -mt-0.5 mr-1" />}
    {children}
  </button>
);

const MyStudyDetailPage = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const study = useMyStudy({ includeTrashed: true });
  const notebook = study.notebooks.find((n) => n.id === notebookId);
  const sessionId = notebook?.session_id || null;

  const nb = useSessionNotebook(sessionId);
  const { annotations, remove: removeAnnotation } = useSessionAnnotations(sessionId) as any;

  // Soft-handle remove
  const handleRemoveAnn = async (id: string) => {
    if (typeof removeAnnotation === "function") await removeAnnotation(id);
  };

  // Load session for Dynamo pane context
  const [sessionData, setSessionData] = useState<{
    transcript_entries: LiveTranscriptEntry[];
    subtopics: string[];
    summaries: LiveSummary[];
    speaker_names: Record<string, string>;
    share_token: string | null;
  } | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("transcript_entries, subtopics, summaries, speaker_names, share_token")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled || !data) return;
      setSessionData({
        transcript_entries: (data.transcript_entries as any) || [],
        subtopics: (data.subtopics as any) || [],
        summaries: (data.summaries as any) || [],
        speaker_names: (data.speaker_names as any) || {},
        share_token: (data as any).share_token ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const qa = useRecordQA(sessionId || "", sessionData?.share_token);

  const [tab, setTab] = useState<Tab>("thoughts");
  const [renameOpen, setRenameOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const reader = useReaderNotes(notebookId ?? null);

  const handleJumpReaderNote = (n: ReaderNote) => {
    setTab(n.anchor_kind === "my_take" ? "my_take" : "thoughts");
    setSplit((s) => ({ ...s, enabled: false }));
    setInboxOpen(false);
    if (!n.read_at) reader.markRead(n.id);
  };

  const [split, setSplit] = useState<SplitState>(() => ({
    enabled: false,
    left: "thoughts",
    right: "annotations",
    ratio: 0.5,
  }));
  // Hydrate split when sessionId arrives
  useEffect(() => {
    if (!sessionId) return;
    const s = loadSplit(sessionId);
    if (s) setSplit(s);
  }, [sessionId]);
  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(SPLIT_KEY(sessionId), JSON.stringify(split));
    } catch {
      /* noop */
    }
  }, [split, sessionId]);

  const folder = useMemo(
    () => study.folders.find((f) => f.id === notebook?.folder_id) || null,
    [study.folders, notebook?.folder_id],
  );

  useEffect(() => {
    return () => {
      nb.flushNow?.();
    };
  }, [nb]);

  const splitContainerRef = useRef<HTMLDivElement>(null);

  const tabsArr: Tab[] = ["thoughts", "annotations", "my_take", "dynamo"];
  const tabLabel = (t: Tab) =>
    t === "annotations" ? `Annotations · ${annotations?.length || 0}` : TAB_LABEL[t];

  const renderTab = (t: Tab) => {
    if (t === "thoughts")
      return (
        <ThoughtsTab
          thoughts={nb.thoughts}
          setThoughts={nb.setThoughts}
          readerNotes={reader.inThoughts}
          onDismissReaderNote={reader.dismiss}
          onJumpReaderNote={handleJumpReaderNote}
        />
      );
    if (t === "annotations")
      return (
        <AnnotationsTab
          annotations={annotations || []}
          onJump={(a) => navigate(`/live/${notebook?.session_id}#annotation-${a.id}`)}
          onRemove={handleRemoveAnn}
        />
      );
    if (t === "my_take")
      return (
        <MyTakeTab
          myTake={nb.myTake}
          setMyTake={nb.setMyTake}
          onDelete={nb.deleteMyTake}
          onPublish={nb.publish}
          onUnpublish={nb.unpublish}
          isPublished={nb.isPublished}
        />
      );
    // dynamo
    if (!sessionData) {
      return (
        <p className="text-xs italic text-muted-foreground p-2">Loading session context…</p>
      );
    }
    return (
      <DynamoChatPane
        messages={qa.messages}
        input={qa.input}
        setInput={qa.setInput}
        loading={qa.loading}
        onSend={qa.send}
        transcriptEntries={sessionData.transcript_entries}
        subtopics={sessionData.subtopics}
        summaries={sessionData.summaries}
        speakerNames={sessionData.speaker_names}
      />
    );
  };

  const enterSplit = () => {
    const otherTab = tabsArr.find((t) => t !== tab) || "annotations";
    setSplit((s) => ({ ...s, enabled: true, left: tab, right: otherTab }));
  };

  if (!notebookId) return null;

  const PaneHeader = ({ value, other }: { value: Tab; other: Tab }) => (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-accent/30">
      <div className="flex items-center gap-1.5 min-w-0">
        {value === "dynamo" && <Sparkles className="w-3 h-3 text-muted-foreground" />}
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
          {tabLabel(value)}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setSplit((s) => ({ ...s, left: s.right, right: s.left }))}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          aria-label="Swap panes"
          title="Swap panes"
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setTab(other);
            setSplit((s) => ({ ...s, enabled: false }));
          }}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          aria-label="Close pane"
          title="Close pane"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 lg:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to="/my-study"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Study
          </Link>

          {!notebook ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground font-body">Loading notebook…</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-display truncate">
                    {notebookTitle(notebook)}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setRenameOpen(true)}
                    className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                    aria-label="Rename notebook"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Mobile: overflow menu */}
                <div className="sm:hidden shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/live/${notebook.session_id}`}>Open session record</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInboxOpen(true)}>
                        Notes from readers{reader.unreadCount > 0 ? ` (${reader.unreadCount})` : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRenameOpen(true)}>Rename</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const token = await study.generateShareToken(notebook.id);
                          if (token) {
                            await navigator.clipboard.writeText(
                              `${window.location.origin}/study/shared/${token}`,
                            );
                            toast.success("Private link copied");
                          }
                        }}
                      >
                        Share
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Desktop: inline actions */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setInboxOpen((v) => !v)}
                    className="relative inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1.5"
                    aria-label="Notes from readers"
                    title="Notes from readers"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {reader.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-[16px] text-center font-medium">
                        {reader.unreadCount > 9 ? "9+" : reader.unreadCount}
                      </span>
                    )}
                  </button>
                  <Link
                    to={`/live/${notebook.session_id}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1.5"
                  >
                    Open session record <ArrowUpRight className="w-3 h-3" />
                  </Link>
                  <ShareMenu
                    notebookId={notebook.id}
                    sessionId={notebook.session_id}
                    shareToken={notebook.share_token}
                    onGenerate={study.generateShareToken}
                  />
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-body mb-4 sm:mb-6">
                {notebook.session_created_at
                  ? `Recorded ${new Date(notebook.session_created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : ""}
                {folder && <> · in 📁 {folder.name}</>}
              </p>

              {/* Tab bar (single mode) */}
              {!split.enabled && (
                <div className="flex items-end px-1 border-b border-border overflow-x-auto">
                  <div className="flex items-end gap-1 flex-1 min-w-0">
                    {tabsArr.map((t) => (
                      <TabBtn
                        key={t}
                        active={tab === t}
                        onClick={() => setTab(t)}
                        hasIcon={t === "dynamo"}
                      >
                        {tabLabel(t)}
                      </TabBtn>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={enterSplit}
                    className="shrink-0 ml-2 mb-1 p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                    aria-label="Enter split view"
                    title="Split view"
                  >
                    <Columns2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Body */}
              {split.enabled ? (
                <div className="bg-background border border-border rounded-md min-h-[60vh] sm:min-h-[480px] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-accent/20">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Split view
                    </span>
                    <button
                      type="button"
                      onClick={() => setSplit((s) => ({ ...s, enabled: false }))}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      aria-label="Exit split view"
                      title="Exit split view"
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div
                    ref={splitContainerRef}
                    className={cn(
                      "flex-1 min-h-0 flex",
                      isMobile ? "flex-col" : "flex-row",
                    )}
                  >
                    <div
                      style={
                        isMobile
                          ? { height: `${split.ratio * 100}%` }
                          : { width: `${split.ratio * 100}%` }
                      }
                      className="flex flex-col min-h-0 min-w-0"
                    >
                      <PaneHeader value={split.left} other={split.right} />
                      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
                        {renderTab(split.left)}
                      </div>
                    </div>
                    <NotebookSplitDivider
                      direction={isMobile ? "horizontal" : "vertical"}
                      ratio={split.ratio}
                      onChange={(r) => setSplit((s) => ({ ...s, ratio: r }))}
                      containerRef={splitContainerRef}
                    />
                    <div
                      style={
                        isMobile
                          ? { height: `${(1 - split.ratio) * 100}%` }
                          : { width: `${(1 - split.ratio) * 100}%` }
                      }
                      className="flex flex-col min-h-0 min-w-0"
                    >
                      <PaneHeader value={split.right} other={split.left} />
                      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
                        {renderTab(split.right)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-background border border-border border-t-0 rounded-b-md p-3 sm:p-4 md:p-6 min-h-[60vh] sm:min-h-[400px]">
                  {nb.loading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-accent rounded animate-pulse w-1/2" />
                      <div className="h-4 bg-accent rounded animate-pulse w-2/3" />
                    </div>
                  ) : (
                    renderTab(tab)
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {notebook && (
        <RenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          title="Rename notebook"
          initialValue={notebookTitle(notebook)}
          onSubmit={async (name) => {
            await study.renameNotebook(notebook.id, name);
            toast.success("Renamed");
          }}
        />
      )}
    </AppLayout>
  );
};

export default MyStudyDetailPage;
