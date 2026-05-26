import { useState } from "react";
import { ChevronDown } from "lucide-react";
import FloatingOverlay from "./FloatingOverlay";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ArgumentMapContent, {
  type ArgumentMapEntryInput,
  type TranscriptEntryInput,
  type SubtopicInput,
} from "./ArgumentMapContent";

/** Legacy node shape kept for back-compat with existing call sites. */
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
  /** Legacy: flat arguments for the current subtopic only. */
  arguments?: ArgumentNode[];
  subtopicTitle?: string;
  analysis?: RoundSummaryEntry[];
  /** New shape — full debate threaded record + transcript across subtopics. */
  transcriptEntries?: TranscriptEntryInput[];
  argumentMap?: ArgumentMapEntryInput[];
  subtopics?: SubtopicInput[];
}

/**
 * Translucent draggable panel that overlays the camera feed and renders
 * the existing LiveArgumentMap.
 */
const ArgumentMapOverlay = ({
  open,
  onClose,
  arguments: args = [],
  subtopicTitle,
  analysis = [],
  transcriptEntries,
  argumentMap,
  subtopics,
}: ArgumentMapOverlayProps) => {
  const [tab, setTab] = useState<"threaded" | "transcript">("threaded");

  // Derive subtopic list from any source.
  const subtopicList: SubtopicInput[] =
    subtopics && subtopics.length > 0
      ? subtopics
      : subtopicTitle
      ? [{ id: subtopicTitle, title: subtopicTitle }]
      : [];

  // Fallback transcripts: derive from the legacy `arguments` prop so old callers
  // still see content under the active subtopic.
  const derivedTranscripts: TranscriptEntryInput[] =
    transcriptEntries ??
    args.map((a) => ({
      id: a.id,
      speaker_side: a.sideLabel,
      text: a.content,
      subtopic: subtopicTitle ?? "",
      timestamp: new Date(a.createdAt).getTime(),
    }));

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
      title="Argument map"
      storageKey="argument-map"
      initialPosition={{ x: 16, y: 16 }}
      initialWidth={560}
      initialHeight={620}
      headerExtras={
        <div className="flex items-center gap-1 mr-1">
          {tabBtn("threaded", "Threaded Record")}
          {tabBtn("transcript", "Transcript")}
        </div>
      }
    >
      <ArgumentMapContent
        tab={tab}
        subtopics={subtopicList}
        transcriptEntries={derivedTranscripts}
        argumentMap={argumentMap ?? []}
        analysis={analysis}
      />
    </FloatingOverlay>
  );
};

export default ArgumentMapOverlay;
