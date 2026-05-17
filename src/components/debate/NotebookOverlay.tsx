import { useState } from "react";
import { ArrowUpRight, Trash2, Globe2, Lock } from "lucide-react";
import FloatingOverlay from "./FloatingOverlay";
import { useSessionAnnotations, type SessionAnnotation } from "@/hooks/useSessionAnnotations";
import { useSessionNotebook } from "@/hooks/useSessionNotebook";

interface NotebookOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Legacy: single-textarea fallback when no record target provided. */
  value?: string;
  onChange?: (val: string) => void;
  /** When provided, an Annotations tab is shown listing the user's debate annotations. */
  recordType?: "debate" | "live_session" | "change_my_mind";
  recordId?: string;
}

const NotebookOverlay = ({
  open,
  onClose,
  value,
  onChange,
  recordType,
  recordId,
}: NotebookOverlayProps) => {
  const target = recordType && recordId ? { recordType, recordId } : null;
  const [tab, setTab] = useState<"take" | "thoughts" | "annotations">("take");
  const { annotations, remove } = useSessionAnnotations(target as any);
  // Live-bound notebook (My Take + Thoughts) when a target exists.
  const nb = useSessionNotebook(target);

  const tabBtn = (
    id: "take" | "thoughts" | "annotations",
    label: string,
    count?: number,
  ) => (
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
    <FloatingOverlay
      open={open}
      onClose={onClose}
      eyebrow="Personal"
      title="My notebook"
      storageKey="notebook"
      initialPosition={{ x: 16, y: 16 }}
      initialWidth={360}
      initialHeight={460}
      headerExtras={
        target ? (
          <div className="flex items-center gap-1 mr-1">
            {tabBtn("take", "My Take")}
            {tabBtn("thoughts", "Thoughts")}
            {tabBtn("annotations", "Annotations", annotations.length)}
          </div>
        ) : null
      }
    >
      {!target ? (
        <div className="p-3 h-full flex">
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="Your notes appear here. Highlight any text in the room to capture an annotation…"
            className="flex-1 min-h-[200px] w-full bg-background/40 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
        </div>
      ) : tab === "take" ? (
        <div className="p-3 h-full flex flex-col gap-2">
          <textarea
            value={nb.myTake}
            onChange={(e) => nb.setMyTake(e.target.value)}
            placeholder="One Tweet-length take. Publish it separately from your notebook…"
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
      ) : tab === "thoughts" ? (
        <div className="p-3 h-full flex">
          <textarea
            value={nb.thoughts}
            onChange={(e) => nb.setThoughts(e.target.value)}
            placeholder="Your private thoughts. Auto-saved as you type…"
            className="flex-1 min-h-[200px] w-full bg-background/40 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {annotations.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              No annotations yet. Highlight any text in the debate to capture one.
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
    </FloatingOverlay>
  );
};

export default NotebookOverlay;
