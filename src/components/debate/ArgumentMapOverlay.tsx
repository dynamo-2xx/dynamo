import { useState } from "react";
import LiveArgumentMap from "./LiveArgumentMap";
import FloatingOverlay from "./FloatingOverlay";

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
  const [tab, setTab] = useState<"map" | "analysis">("map");
  const tabBtn = (id: "map" | "analysis", label: string) => (
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
      title={`Argument map${subtopicTitle ? ` · ${subtopicTitle}` : ""}`}
      storageKey="argument-map"
      initialPosition={{ x: 16, y: 16 }}
      initialWidth={420}
      initialHeight={520}
      headerExtras={
        <div className="flex items-center gap-1 mr-1">
          {tabBtn("map", "Map")}
          {tabBtn("analysis", "Analysis")}
        </div>
      }
    >
      {tab === "map" ? (
        <div className="px-3 py-3" data-annotatable>
          <LiveArgumentMap arguments={args} compact />
        </div>
      ) : (
        <div className="px-3 py-3 space-y-3" data-annotatable>
          {analysis.length === 0 ? (
            <p className="text-xs italic text-muted-foreground py-4 text-center">
              No AI analysis yet. Subtopic summaries appear here as the debate progresses.
            </p>
          ) : (
            analysis.map((a) => (
              <div key={a.subtopicId} className="border border-foreground/10 rounded-lg p-3 bg-background/40">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body mb-1">
                  {a.subtopicTitle}
                </p>
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
              </div>
            ))
          )}
        </div>
      )}
    </FloatingOverlay>
  );
};

export default ArgumentMapOverlay;
