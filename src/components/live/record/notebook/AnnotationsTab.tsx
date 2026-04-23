import { ArrowUpRight, Trash2 } from "lucide-react";
import type { SessionAnnotation } from "@/hooks/useSessionAnnotations";

interface Props {
  annotations: SessionAnnotation[];
  onJump: (a: SessionAnnotation) => void;
  onRemove: (id: string) => void;
}

const AnnotationsTab = ({ annotations, onJump, onRemove }: Props) => {
  if (annotations.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No annotations yet. Highlight text in a summary or transcript bubble to capture one.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {annotations.map((a) => (
        <div key={a.id} className="border border-foreground/10 rounded-md p-2">
          <p className="text-xs italic text-foreground/80 line-clamp-3 mb-1">"{a.excerpt}"</p>
          {a.note && <p className="text-xs text-foreground/90 font-body mb-1">{a.note}</p>}
          <div className="flex items-center justify-between">
            <button
              onClick={() => onJump(a)}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Jump to source
              <ArrowUpRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => onRemove(a.id)}
              className="text-[11px] text-muted-foreground hover:text-destructive"
              aria-label="Delete annotation"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnnotationsTab;