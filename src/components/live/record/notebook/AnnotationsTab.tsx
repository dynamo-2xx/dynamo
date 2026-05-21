import { useState } from "react";
import { ArrowUpRight, Trash2, Pencil, Check, X as XIcon } from "lucide-react";
import type { SessionAnnotation } from "@/hooks/useSessionAnnotations";
import RichTextEditor, { type Editor } from "@/components/study/RichTextEditor";

interface Props {
  annotations: SessionAnnotation[];
  onJump: (a: SessionAnnotation) => void;
  onRemove: (id: string) => void;
  onUpdate?: (id: string, patch: { note?: string; excerpt?: string }) => void;
  onEditorReady?: (e: Editor | null) => void;
  onEditorFocus?: () => void;
  readOnly?: boolean;
}

const AnnotationsTab = ({
  annotations,
  onJump,
  onRemove,
  onUpdate,
  onEditorReady,
  onEditorFocus,
  readOnly,
}: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (annotations.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No annotations yet. Highlight text in a summary or transcript bubble to capture one.
      </p>
    );
  }

  const startEdit = (a: SessionAnnotation) => {
    setEditingId(a.id);
    setDraft(a.note || "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
    onEditorReady?.(null);
  };
  const saveEdit = (id: string) => {
    onUpdate?.(id, { note: draft });
    setEditingId(null);
    setDraft("");
    onEditorReady?.(null);
  };

  return (
    <div className="space-y-2">
      {annotations.map((a) => {
        const isEditing = editingId === a.id;
        return (
          <div key={a.id} className="border border-foreground/10 rounded-md p-2">
            <p className="text-xs italic text-foreground/80 line-clamp-3 mb-1">"{a.excerpt}"</p>
            {isEditing ? (
              <div className="border border-border rounded-md p-2 mb-2">
                <RichTextEditor
                  value={draft}
                  onChange={setDraft}
                  onEditorReady={onEditorReady}
                  onFocus={onEditorFocus}
                  placeholder="Add a note…"
                  minHeight="80px"
                />
              </div>
            ) : a.note ? (
              <div
                className="text-xs text-foreground/90 font-body mb-1 prose prose-sm max-w-none [&_p]:my-1"
                dangerouslySetInnerHTML={{ __html: a.note }}
              />
            ) : (
              <p className="text-[11px] italic text-muted-foreground/70 mb-1">No note yet.</p>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onJump(a)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Jump to source
                <ArrowUpRight className="w-3 h-3" />
              </button>
              {!readOnly && (
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveEdit(a.id)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Save annotation"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Cancel edit"
                      title="Cancel"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    {onUpdate && (
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Edit note"
                        title="Edit note"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(a.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Delete annotation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnnotationsTab;