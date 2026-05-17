import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import LiveArgumentMap from "./LiveArgumentMap";
import FloatingOverlay from "./FloatingOverlay";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ArgumentNode {
  id: string;
  content: string;
  argumentType: string;
  sideLabel: string;
  sideOrder: number;
  participantId: string;
  parentArgumentId: string | null;
  createdAt: string;
  isEdited: boolean;
}

export interface RoundSummaryEntry {
  subtopicId: string;
  subtopicTitle: string;
  summary: string;
  keyArguments?: Array<{ side: string; content: string; type: string; significance: string }>;
}

interface ArgumentMapOverlayProps {
  open: boolean;
  onClose: () => void;
  arguments: ArgumentNode[];
  subtopicTitle?: string;
  /** Per-subtopic AI analysis (round summaries + key arguments). Drives the Analysis tab. */
  analysis?: RoundSummaryEntry[];
}

/**
 * Translucent draggable panel that overlays the camera feed and renders
 * the existing LiveArgumentMap.
 */
const ArgumentMapOverlay = ({ open, onClose, arguments: args, subtopicTitle, analysis = [] }: ArgumentMapOverlayProps) => {
  const [tab, setTab] = useState<"threaded" | "transcript">("threaded");
  const tabBtn = (id: "threaded" | "transcript", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
        tab === id ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <FloatingOverlay
      open={open}
      onClose={onClose}
      eyebrow="Live insights"
      title={`Record${subtopicTitle ? ` · ${subtopicTitle}` : ""}`}
      storageKey="argument-map"
      initialPosition={{ x: 16, y: 16 }}
      initialWidth={420}
      initialHeight={520}
      headerExtras={
        <div className="flex items-center gap-1 mr-1">
          {tabBtn("threaded", "Threaded Record")}
          {tabBtn("transcript", "Transcript")}
        </div>
      }
    >
      {tab === "threaded" ? (
        <div className="px-3 py-3 space-y-3" data-annotatable>
          {analysis.length === 0 ? (
            <div className="px-3 py-3">
              <LiveArgumentMap arguments={args} compact />
            </div>
          ) : (
            analysis.map((a) => (
              <Collapsible key={a.subtopicId} defaultOpen>
                <CollapsibleTrigger className="w-full flex items-center justify-between border border-foreground/10 rounded-lg px-3 py-2 bg-background/40 hover:bg-background/60 transition-colors">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                    {a.subtopicTitle}
                  </p>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-x border-b border-foreground/10 rounded-b-lg px-3 py-2 bg-background/30 -mt-px">
                  <p className="text-xs text-foreground font-body leading-relaxed whitespace-pre-wrap">
                    {a.summary}
                  </p>
                  {a.keyArguments && a.keyArguments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {a.keyArguments.map((k, i) => (
                        <div key={i} className="text-[11px] text-foreground/80 font-body border-l-2 border-foreground/15 pl-2">
                          <span className="font-semibold">{k.side}</span>: {k.content}
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      ) : (
        <div className="px-3 py-3 space-y-3" data-annotatable>
          {args.length === 0 ? (
            <p className="text-xs italic text-muted-foreground py-4 text-center">
              No transcript yet. Entries appear here as the debate progresses.
            </p>
          ) : (
            [...args].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((arg) => (
              <div key={arg.id} className="border-l-2 border-foreground/15 pl-3 py-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body mb-0.5">
                  {arg.sideLabel} · {arg.argumentType}
                </p>
                <p className="text-xs text-foreground font-body leading-relaxed whitespace-pre-wrap">
                  {arg.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </FloatingOverlay>
  );
};

export default ArgumentMapOverlay;
