import { useEffect, useRef, useState } from "react";
import { X, ArrowUpRight, BookOpen, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { SessionAnnotation } from "@/hooks/useSessionAnnotations";

type Tab = "thoughts" | "annotations" | "my_take";

interface NotebookPanelProps {
  open: boolean;
  onClose: () => void;
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
  notebookId?: string | null;
}

/**
 * Draggable + resizable notebook panel with three Chrome-style tabs:
 * Thoughts · Annotations · My Take.
 */
const NotebookPanel = ({
  open,
  onClose,
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
  notebookId,
}: NotebookPanelProps) => {
  const [tab, setTab] = useState<Tab>("thoughts");
  const [pos, setPos] = useState({ x: 24, y: 80 });
  const [size, setSize] = useState({ w: 380, h: 500 });
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resize = useRef<{ ow: number; oh: number; sx: number; sy: number } | null>(null);

  // Image paste support in Thoughts → inline data URL.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setThoughts(thoughts + `\n\n![pasted image](${dataUrl})\n\n`);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  // Drag handlers
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) {
        setPos({
          x: Math.max(0, e.clientX - drag.current.ox + drag.current.sx),
          y: Math.max(0, e.clientY - drag.current.oy + drag.current.sy),
        });
      }
      if (resize.current) {
        setSize({
          w: Math.max(280, resize.current.ow + (e.clientX - resize.current.sx)),
          h: Math.max(280, resize.current.oh + (e.clientY - resize.current.sy)),
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
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    drag.current = { ox: e.clientX, oy: e.clientY, sx: pos.x, sy: pos.y };
  };
  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    resize.current = { ow: size.w, oh: size.h, sx: e.clientX, sy: e.clientY };
  };

  if (!open) return null;

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        className={`relative px-3 pt-1.5 pb-2 text-xs font-medium rounded-t-md border border-b-0 transition-colors ${
          active
            ? "bg-background border-foreground/10 text-foreground -mb-px z-10"
            : "bg-foreground/[0.04] border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 50,
      }}
      className="bg-background border border-foreground/10 rounded-lg shadow-xl flex flex-col"
    >
      {/* Drag handle / eyebrow */}
      <div
        onMouseDown={startDrag}
        className="cursor-move flex items-center justify-between px-3 py-1.5 border-b border-foreground/10 bg-foreground/[0.02] rounded-t-lg select-none"
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <BookOpen className="w-3 h-3" />
          Notebook
        </div>
        <div className="flex items-center gap-2">
          {notebookId && (
            <Link
              to={`/my-study/${notebookId}`}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              title="Open in My Study"
            >
              <ExternalLink className="w-3 h-3" />
              My Study
            </Link>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close notebook"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chrome tabs */}
      <div className="flex items-end gap-1 px-2 pt-1.5 border-b border-foreground/10 bg-foreground/[0.02]">
        <TabBtn id="thoughts" label="Thoughts" />
        <TabBtn id="annotations" label={`Annotations · ${annotations.length}`} />
        <TabBtn id="my_take" label="My Take" />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "thoughts" && (
          <Textarea
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            onPaste={handlePaste}
            placeholder="Free-form thoughts. Paste images directly…"
            className="w-full h-full min-h-[240px] resize-none border-foreground/10 text-sm font-body"
          />
        )}

        {tab === "annotations" && (
          <div className="space-y-2">
            {annotations.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No annotations yet. Highlight text in a summary or transcript bubble to capture one.
              </p>
            ) : (
              annotations.map((a) => (
                <div key={a.id} className="border border-foreground/10 rounded-md p-2">
                  <p className="text-xs italic text-foreground/80 line-clamp-3 mb-1">
                    “{a.excerpt}”
                  </p>
                  {a.note && (
                    <p className="text-xs text-foreground/90 font-body mb-1">{a.note}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onJumpToAnnotation(a)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Jump to source
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemoveAnnotation(a.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
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

        {tab === "my_take" && (
          <div className="flex flex-col h-full">
            {!myTake ? (
              <p className="text-xs italic text-muted-foreground">
                Your take will appear here after you leave this page. The AI will consolidate your
                thoughts and annotations into a clean summary.
              </p>
            ) : (
              <>
                <div className="relative mb-2">
                  <Textarea
                    value={myTake}
                    onChange={(e) => setMyTake(e.target.value)}
                    className="w-full min-h-[220px] resize-none border-foreground/10 text-sm pr-7 font-body"
                  />
                  <button
                    type="button"
                    onClick={onDeleteMyTake}
                    className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="Delete take"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-auto flex justify-end gap-2 pt-2 border-t border-foreground/10">
                  {isPublished ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await onUnpublish();
                        toast.success("Unpublished from your profile");
                      }}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await onPublish();
                        toast.success("Published to your profile");
                      }}
                    >
                      Publish to profile
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Resize grip — bottom-right corner */}
      <div
        onMouseDown={startResize}
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-foreground/20 rounded-br-lg"
        aria-label="Resize"
      />
    </div>
  );
};

export default NotebookPanel;