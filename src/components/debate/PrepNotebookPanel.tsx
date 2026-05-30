import { toast } from "sonner";
import NotebookPanel from "@/components/live/record/NotebookPanel";
import { useSessionAnnotations, type SessionAnnotation } from "@/hooks/useSessionAnnotations";
import { useSessionNotebook } from "@/hooks/useSessionNotebook";

interface PrepNotebookPanelProps {
  recordType: "debate" | "live_session" | "change_my_mind";
  recordId: string;
}

/**
 * Inline notebook used inside the Preparation window. Thin wrapper that
 * mounts the unified `NotebookPanel` in `inline` mode so the prep notebook
 * looks and behaves identically to the room / record notebook (incl. the
 * "Suggest from my Thoughts + Annotations" button on the My Take tab).
 */
const PrepNotebookPanel = ({ recordType, recordId }: PrepNotebookPanelProps) => {
  const target = { recordType, recordId };
  const notebook = useSessionNotebook(target);
  const annotations = useSessionAnnotations(target as any);

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
    } else {
      toast("Open the record to jump to that annotation.");
    }
  };

  return (
    <NotebookPanel
      open
      inline
      onClose={() => undefined}
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
      transcriptEntries={[]}
      subtopics={[]}
      summaries={[]}
      speakerNames={{}}
    />
  );
};

export default PrepNotebookPanel;