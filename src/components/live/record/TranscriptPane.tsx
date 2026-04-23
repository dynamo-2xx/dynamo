import { forwardRef } from "react";
import SpeakerBubble from "@/components/live/SpeakerBubble";
import type { LiveTranscriptEntry } from "@/hooks/useLiveTranscription";

interface TranscriptPaneProps {
  entries: LiveTranscriptEntry[];
  getSpeakerName: (speakerId: number) => string;
  readOnly?: boolean;
  onRenameSpeaker?: (speakerId: number, name: string) => void;
  onSplit?: (entryId: string, splitIndex: number) => void;
  onMerge?: (entryId: string) => void;
}

/**
 * Right pane: full transcript using SpeakerBubble. Each entry is wrapped with
 * data-entry-id so [View transcript] jumps can scrollIntoView + flash.
 */
const TranscriptPane = forwardRef<HTMLDivElement, TranscriptPaneProps>(
  ({ entries, getSpeakerName, readOnly, onRenameSpeaker, onSplit, onMerge }, ref) => {
    if (entries.length === 0) {
      return (
        <div ref={ref} className="px-2 py-6">
          <p className="text-muted-foreground text-sm italic">No transcript entries.</p>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-2 py-3 space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} data-entry-id={entry.id} className="rounded-lg transition-colors">
            <SpeakerBubble
              entry={entry}
              speakerName={getSpeakerName(entry.speaker_id)}
              readOnly={readOnly}
              onRenameSpeaker={(name) => onRenameSpeaker?.(entry.speaker_id, name)}
              onSplit={(idx) => onSplit?.(entry.id, idx)}
              onMerge={() => onMerge?.(entry.id)}
            />
          </div>
        ))}
      </div>
    );
  },
);
TranscriptPane.displayName = "TranscriptPane";

export default TranscriptPane;