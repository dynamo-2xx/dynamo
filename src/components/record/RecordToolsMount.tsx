import { useState } from "react";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import NotebookPanel from "@/components/live/record/NotebookPanel";
import HighlightAnnotateLayer from "@/components/live/record/HighlightAnnotateLayer";
import { useSessionNotebook } from "@/hooks/useSessionNotebook";
import { useSessionAnnotations, type SessionAnnotation } from "@/hooks/useSessionAnnotations";
import type { LiveTranscriptEntry, LiveSummary } from "@/hooks/useLiveTranscription";

interface RecordToolsMountProps {
  recordType: "live_session" | "debate" | "change_my_mind" | "imported_record";
  recordId: string;
  /** CSS selector for the container that wraps highlightable transcript / argument elements. */
  containerSelector?: string;
  transcriptEntries: LiveTranscriptEntry[];
  subtopics: string[];
  summaries?: LiveSummary[];
  speakerNames?: Record<string, string>;
}

/**
 * Floating notebook button + panel + highlight-to-annotate layer.
 * Drop-in for Debate and Change My Mind pages.
 */
const RecordToolsMount = ({
  recordType,
  recordId,
  containerSelector = "[data-record-root]",
  transcriptEntries,
  subtopics,
  summaries = [],
  speakerNames = {},
}: RecordToolsMountProps) => {
  const [open, setOpen] = useState(false);
  const notebook = useSessionNotebook({ recordType, recordId });
  const supportsAnnotations = recordType !== "imported_record";
  const annotations = useSessionAnnotations({
    recordType: supportsAnnotations ? (recordType as any) : "live_session",
    recordId: supportsAnnotations ? recordId : "00000000-0000-0000-0000-000000000000",
  });

  const jumpToAnnotation = (a: SessionAnnotation) => {
    const sel =
      a.node_kind === "argument"
        ? `[data-argument-id="${a.node_id}"]`
        : a.node_kind === "transcript"
          ? `[data-entry-id="${a.node_id}"]`
          : `[data-summary-node-id="${a.node_id}"]`;
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-foreground/40", "rounded-lg");
      setTimeout(() => el.classList.remove("ring-2", "ring-foreground/40", "rounded-lg"), 1600);
    }
  };

  return (
    <>
      {supportsAnnotations && (
        <HighlightAnnotateLayer
          containerSelector={containerSelector}
          onAnnotate={(input) => {
            void annotations.add(input);
            toast.success("Saved to notebook");
          }}
        />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-background border border-foreground/10 shadow-sm flex items-center justify-center hover:bg-foreground/[0.04] transition-colors"
        aria-label="Open notebook"
      >
        <BookOpen className="w-5 h-5 text-foreground" />
      </button>

      <NotebookPanel
        open={open}
        onClose={() => setOpen(false)}
        sessionId={recordId}
        recordType={recordType}
        recordId={recordId}
        thoughts={notebook.thoughts}
        setThoughts={notebook.setThoughts}
        myTake={notebook.myTake}
        setMyTake={notebook.setMyTake}
        onDeleteMyTake={notebook.deleteMyTake}
        onPublish={notebook.publish}
        onUnpublish={notebook.unpublish}
        isPublished={notebook.isPublished}
        annotations={annotations.annotations}
        onJumpToAnnotation={jumpToAnnotation}
        onRemoveAnnotation={annotations.remove}
        onUpdateAnnotation={annotations.update}
        notebookId={notebook.notebook?.id ?? null}
        transcriptEntries={transcriptEntries}
        subtopics={subtopics}
        summaries={summaries}
        speakerNames={speakerNames}
      />
    </>
  );
};

export default RecordToolsMount;