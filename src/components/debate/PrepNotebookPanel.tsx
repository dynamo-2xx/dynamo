import { useState } from "react";
import { ArrowUpRight, Trash2, Globe2, Lock } from "lucide-react";
import { useSessionAnnotations, type SessionAnnotation } from "@/hooks/useSessionAnnotations";
import { useSessionNotebook } from "@/hooks/useSessionNotebook";

interface PrepNotebookPanelProps {
  recordType: "debate" | "live_session" | "change_my_mind";
  recordId: string;
}

/**
 * Inline (non-floating) version of NotebookOverlay used inside the
 * Preparation window. Mirrors the four tabs: My Take, Thoughts,
 * Annotations, Dynamo (Dynamo is read-only placeholder in prep).
 */
const PrepNotebookPanel = ({ recordType, recordId }: PrepNotebookPanelProps) => {
  const target = { recordType, recordId };
  const [tab, setTab] = useState<"thoughts" | "annotations" | "take" | "dynamo">("thoughts");
  const { annotations, remove } = useSessionAnnotations(target as any);
  const nb = useSessionNotebook(target);

  const tabBtn = (id: typeof tab, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
        tab === id ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 && (
        <span className="ml-1 text-[10px] text-muted-foreground">({count})</span>
      )}
    </button>
  );

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="border-b border-border px-3 py-2 flex items-center gap-1">
        {tabBtn("thoughts", "My Thoughts")}
        {tabBtn("annotations", "Annotations", annotations.length)}
        {tabBtn("take", "My Take")}
        {tabBtn("dynamo", "Dynamo")}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "thoughts" && (
          <div className="p-3 h-full">
            <textarea
              value={nb.thoughts}
              onChange={(e) => nb.setThoughts(e.target.value)}
              placeholder="Your private thoughts. Auto-saved as you type…"
              className="w-full h-full min-h-[200px] bg-background/40 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
          </div>
        )}
        {tab === "annotations" && (
          <div className="p-3 space-y-2">
            {annotations.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No annotations yet. Highlight any text in the room to capture one.
              </p>
            ) : (
              annotations.map((a: SessionAnnotation) => (
                <div key={a.id} className="border border-foreground/10 rounded-md p-2">
                  <p className="text-xs italic text-foreground/80 line-clamp-3 mb-1">"{a.excerpt}"</p>
                  {a.note && (
                    <p className="text-xs text-foreground/90 font-body whitespace-pre-wrap mb-1">{a.note}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                      {a.node_kind}
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Delete annotation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "take" && (
          <div className="p-3 h-full flex flex-col gap-2">
            <textarea
              value={nb.myTake}
              onChange={(e) => nb.setMyTake(e.target.value)}
              placeholder="Your take — one tweet-length statement…"
              className="flex-1 min-h-[160px] w-full bg-background/40 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
              maxLength={280}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-body">
              <span>{nb.myTake.length}/280</span>
              <button
                type="button"
                onClick={nb.isPublished ? nb.unpublish : nb.publish}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-foreground/15 hover:bg-foreground/5"
              >
                {nb.isPublished ? <><Globe2 className="w-3 h-3" /> Published</> : <><Lock className="w-3 h-3" /> Publish</>}
              </button>
            </div>
          </div>
        )}
        {tab === "dynamo" && (
          <div className="p-3 text-xs italic text-muted-foreground">
            Dynamo chat is available in the main room. During preparation, focus on your Thoughts, Annotations, and My Take.
          </div>
        )}
      </div>
    </div>
  );
};

export default PrepNotebookPanel;