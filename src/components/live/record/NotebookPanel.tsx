import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  BookOpen,
  ExternalLink,
  Columns2,
  ArrowLeftRight,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SessionAnnotation } from "@/hooks/useSessionAnnotations";
import type { LiveTranscriptEntry, LiveSummary } from "@/hooks/useLiveTranscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import ThoughtsTab from "./notebook/ThoughtsTab";
import AnnotationsTab from "./notebook/AnnotationsTab";
import MyTakeTab from "./notebook/MyTakeTab";
import DynamoChatPane from "./DynamoChatPane";
import NotebookSplitDivider from "./NotebookSplitDivider";
import { useRecordQA } from "@/hooks/useRecordQA";

type Tab = "thoughts" | "annotations" | "my_take" | "dynamo";

const TAB_LABEL: Record<Tab, string> = {
  thoughts: "Thoughts",
  annotations: "Annotations",
  my_take: "My Take",
  dynamo: "Dynamo",
};

interface NotebookPanelProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  thoughts: string;
  setThoughts: (v: string) => void;
  myTake: string;
  setMyTake: (v: string) => void;
  onDeleteMyTake: () => void;
  onPublish: () => Promise<void> | void;
  onUnpublish: () => Promise<void> | void;
  isPublished: boolean;
  annotations: SessionAnnotation[];
  onJumpToAnnotation: (a: SessionAnnotation) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation?: (id: string, patch: { note?: string; excerpt?: string }) => void;
  notebookId?: string | null;
  // Dynamo (AI Q&A) context
  transcriptEntries: LiveTranscriptEntry[];
  subtopics: string[];
  summaries: LiveSummary[];
  speakerNames: Record<string, string>;
  shareToken?: string | null;
}

interface SplitState {
  enabled: boolean;
  left: Tab;
  right: Tab;
  ratio: number;
}

const SPLIT_STORAGE_KEY = (sid: string) => `dynamo:notebook-split:${sid}`;

const loadSplit = (sessionId: string): SplitState | null => {
  try {
    const raw = localStorage.getItem(SPLIT_STORAGE_KEY(sessionId));
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.enabled !== "boolean") return null;
    return v;
  } catch {
    return null;
  }
};

const saveSplit = (sessionId: string, state: SplitState) => {
  try {
    localStorage.setItem(SPLIT_STORAGE_KEY(sessionId), JSON.stringify(state));
  } catch {
    /* noop */
  }
};

const NotebookPanel = ({
  open,
  onClose,
  sessionId,
  thoughts,
  setThoughts,
  myTake,
  setMyTake,
  onDeleteMyTake,
  onPublish,
  onUnpublish,
  isPublished,
  annotations,
  onJumpToAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  notebookId,
  transcriptEntries,
  subtopics,
  summaries,
  speakerNames,
  shareToken,
}: NotebookPanelProps) => {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("thoughts");

  // Split state — persisted per session
  const [split, setSplit] = useState<SplitState>(() =>
    loadSplit(sessionId) || { enabled: false, left: "thoughts", right: "annotations", ratio: 0.5 },
  );
  useEffect(() => {
    saveSplit(sessionId, split);
  }, [sessionId, split]);

  // Desktop floating panel pos/size (only used at md+)
  const [pos, setPos] = useState({ x: 24, y: 80 });
  const [size, setSize] = useState({ w: 460, h: 560 });
  const [maximized, setMaximized] = useState(false);
  const prevRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resize = useRef<{ ow: number; oh: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) {
        const nextX = e.clientX - drag.current.ox + drag.current.sx;
        const nextY = e.clientY - drag.current.oy + drag.current.sy;
        const maxX = Math.max(0, window.innerWidth - size.w);
        const maxY = Math.max(0, window.innerHeight - size.h);
        setPos({
          x: Math.min(maxX, Math.max(0, nextX)),
          y: Math.min(maxY, Math.max(0, nextY)),
        });
      }
      if (resize.current) {
        const maxW = Math.max(320, window.innerWidth - pos.x);
        const maxH = Math.max(320, window.innerHeight - pos.y);
        setSize({
          w: Math.min(maxW, Math.max(320, resize.current.ow + (e.clientX - resize.current.sx))),
          h: Math.min(maxH, Math.max(320, resize.current.oh + (e.clientY - resize.current.sy))),
        });
      }
    };
    const up = () => {
      drag.current = null;
      resize.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [pos.x, pos.y, size.w, size.h]);

  // Keep panel within viewport on window resize
  useEffect(() => {
    const onResize = () => {
      if (maximized) {
        setSize({ w: window.innerWidth, h: window.innerHeight });
        setPos({ x: 0, y: 0 });
        return;
      }
      setPos((p) => ({
        x: Math.min(p.x, Math.max(0, window.innerWidth - size.w)),
        y: Math.min(p.y, Math.max(0, window.innerHeight - size.h)),
      }));
      setSize((s) => ({
        w: Math.min(s.w, window.innerWidth),
        h: Math.min(s.h, window.innerHeight),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maximized, size.w, size.h]);

  const toggleMaximize = () => {
    if (maximized) {
      const prev = prevRectRef.current;
      if (prev) {
        setPos({ x: prev.x, y: prev.y });
        setSize({ w: prev.w, h: prev.h });
      }
      setMaximized(false);
    } else {
      prevRectRef.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
      setMaximized(true);
    }
  };

  const startDrag = (e: React.MouseEvent) => {
    drag.current = { ox: e.clientX, oy: e.clientY, sx: pos.x, sy: pos.y };
  };
  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    resize.current = { ow: size.w, oh: size.h, sx: e.clientX, sy: e.clientY };
  };

  // Shared QA state
  const qa = useRecordQA(sessionId, shareToken);

  // Split container ref for divider geometry
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const tabsArr = useMemo<Tab[]>(() => ["thoughts", "annotations", "my_take", "dynamo"], []);

  const tabLabel = (t: Tab) => (t === "annotations" ? `Annotations · ${annotations.length}` : TAB_LABEL[t]);

  if (!open) return null;

  // Render content for a given tab id (used for both single + split modes)
  const renderTab = (t: Tab) => {
    if (t === "thoughts") return <ThoughtsTab thoughts={thoughts} setThoughts={setThoughts} />;
    if (t === "annotations")
      return (
        <AnnotationsTab
          annotations={annotations}
          onJump={onJumpToAnnotation}
          onRemove={onRemoveAnnotation}
        />
      );
    if (t === "my_take")
      return (
        <MyTakeTab
          myTake={myTake}
          setMyTake={setMyTake}
          onDelete={onDeleteMyTake}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          isPublished={isPublished}
        />
      );
    return (
      <DynamoChatPane
        messages={qa.messages}
        input={qa.input}
        setInput={qa.setInput}
        loading={qa.loading}
        onSend={qa.send}
        transcriptEntries={transcriptEntries}
        subtopics={subtopics}
        summaries={summaries}
        speakerNames={speakerNames}
      />
    );
  };

  // Pane header (used only when split mode is enabled)
  const PaneHeader = ({
    side,
    value,
    other,
  }: {
    side: "left" | "right";
    value: Tab;
    other: Tab;
  }) => (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-foreground/10 bg-foreground/[0.02]">
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
            // Closing this side exits split, focus the other tab
            setTab(other);
            setSplit((s) => ({ ...s, enabled: false }));
          }}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          aria-label={`Close ${tabLabel(value)} pane`}
          title="Close pane"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  // Picker shown for the right pane when entering split & no second tab chosen yet
  const SplitTabPicker = ({ exclude, onPick }: { exclude: Tab; onPick: (t: Tab) => void }) => (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
      <p className="text-xs italic text-muted-foreground font-body">Pick a tab to compare…</p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {tabsArr
          .filter((t) => t !== exclude)
          .map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className="px-3 py-1.5 rounded-full border border-foreground/15 text-xs font-body hover:border-foreground/40 hover:bg-foreground/[0.04] transition-colors"
            >
              {tabLabel(t)}
            </button>
          ))}
      </div>
    </div>
  );

  // Single-tab content
  const SingleContent = () => (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">{renderTab(tab)}</div>
  );

  // Split content
  const SplitContent = () => {
    const direction: "horizontal" | "vertical" = isMobile ? "horizontal" : "vertical";
    const firstStyle = isMobile
      ? { height: `${split.ratio * 100}%` }
      : { width: `${split.ratio * 100}%` };
    const secondStyle = isMobile
      ? { height: `${(1 - split.ratio) * 100}%` }
      : { width: `${(1 - split.ratio) * 100}%` };

    const setRatio = (r: number) => setSplit((s) => ({ ...s, ratio: r }));

    return (
      <div
        ref={splitContainerRef}
        className={cn("flex-1 min-h-0 flex", isMobile ? "flex-col" : "flex-row")}
      >
        <div style={firstStyle} className="flex flex-col min-h-0 min-w-0">
          <PaneHeader side="left" value={split.left} other={split.right} />
          <div className="flex-1 overflow-y-auto p-3 min-h-0">{renderTab(split.left)}</div>
        </div>
        <NotebookSplitDivider
          direction={direction}
          ratio={split.ratio}
          onChange={setRatio}
          containerRef={splitContainerRef}
        />
        <div style={secondStyle} className="flex flex-col min-h-0 min-w-0">
          <PaneHeader side="right" value={split.right} other={split.left} />
          <div className="flex-1 overflow-y-auto p-3 min-h-0">{renderTab(split.right)}</div>
        </div>
      </div>
    );
  };

  // Tab button (single mode tab bar)
  const TabBtn = ({ id }: { id: Tab }) => {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        className={cn(
          "relative shrink-0 px-3 pt-2 pb-2.5 text-[13px] md:text-xs font-medium rounded-t-md border border-b-0 transition-colors min-h-[44px] md:min-h-0 whitespace-nowrap",
          active
            ? "bg-background border-foreground/10 text-foreground -mb-px z-10"
            : "bg-foreground/[0.04] border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        {id === "dynamo" && <Sparkles className="w-3 h-3 inline -mt-0.5 mr-1" />}
        {tabLabel(id)}
      </button>
    );
  };

  const enterSplit = () => {
    // Pre-fill: left = current, right = first other
    const otherTab = tabsArr.find((t) => t !== tab) || "annotations";
    setSplit((s) => ({ ...s, enabled: true, left: tab, right: otherTab }));
  };

  // Header (drag bar / grab pill)
  const Header = () => (
    <>
      {/* Mobile grab bar */}
      <div className="md:hidden pt-2 pb-1 flex justify-center">
        <div className="h-1 w-10 rounded-full bg-foreground/20" />
      </div>
      <div
        onMouseDown={isMobile || maximized ? undefined : startDrag}
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-foreground/10 bg-foreground/[0.02] select-none",
          !isMobile && !maximized && "cursor-move rounded-t-lg",
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <BookOpen className="w-3 h-3" />
          Notebook
        </div>
        <div className="flex items-center gap-2">
          {notebookId && (
            <Link
              to={`/my-study/${notebookId}`}
              className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              title="Open in My Study"
            >
              <ExternalLink className="w-3 h-3" />
              My Study
            </Link>
          )}
          <button
            type="button"
            onClick={() => (split.enabled ? setSplit((s) => ({ ...s, enabled: false })) : enterSplit())}
            className={cn(
              "p-1 rounded text-muted-foreground hover:text-foreground transition-colors",
              split.enabled && "text-foreground",
            )}
            aria-label={split.enabled ? "Exit split view" : "Enter split view"}
            title={split.enabled ? "Exit split view" : "Split view"}
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          {!isMobile && (
            <button
              type="button"
              onClick={toggleMaximize}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label={maximized ? "Restore notebook size" : "Maximize notebook"}
              title={maximized ? "Restore" : "Maximize"}
            >
              {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
            aria-label="Close notebook"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  // Tab bar (single mode only — split has its own headers)
  const TabBar = () =>
    !split.enabled ? (
      <div className="flex items-end gap-1 px-2 pt-1.5 border-b border-foreground/10 bg-foreground/[0.02] overflow-x-auto">
        {tabsArr.map((t) => (
          <TabBtn key={t} id={t} />
        ))}
      </div>
    ) : null;

  // Mobile: full-screen bottom sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom-4 duration-200">
        <Header />
        <TabBar />
        {split.enabled ? <SplitContent /> : <SingleContent />}
      </div>
    );
  }

  // Desktop: floating draggable/resizable panel
  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 50,
        maxWidth: "100vw",
        maxHeight: "100vh",
      }}
      className="bg-background border border-foreground/10 rounded-lg shadow-xl flex flex-col"
    >
      <Header />
      <TabBar />
      {split.enabled ? <SplitContent /> : <SingleContent />}

      {!maximized && (
        <div
          onMouseDown={startResize}
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-foreground/20 rounded-br-lg"
          aria-label="Resize"
        />
      )}
    </div>
  );
};

export default NotebookPanel;
