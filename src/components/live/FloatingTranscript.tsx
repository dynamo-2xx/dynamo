import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import FloatingOverlay from "@/components/debate/FloatingOverlay";
import LiveThreadView from "@/components/live/LiveThreadView";
import type { LiveTranscriptEntry, LiveThreadMeta } from "@/hooks/useLiveTranscription";

interface Props {
  entries: LiveTranscriptEntry[];
  threadTitles: Record<string, LiveThreadMeta>;
  getSpeakerName: (id: number) => string;
  getSpeakerAvatar?: (id: number) => string | null | undefined;
  showTimestamps?: boolean;
}

const FloatingTranscript = ({
  entries,
  threadTitles,
  getSpeakerName,
  getSpeakerAvatar,
  showTimestamps,
}: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-background/80 backdrop-blur-md border border-foreground/10 text-xs font-semibold hover:bg-background transition-colors shadow-lg"
      >
        <MessageSquareText className="w-3.5 h-3.5" />
        Transcript
        {entries.length > 0 && (
          <span className="ml-1 text-[10px] bg-foreground/10 rounded-full px-1.5 py-0.5">
            {entries.length}
          </span>
        )}
      </button>
      <FloatingOverlay
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Live"
        title="Transcript"
        initialWidth={360}
        initialHeight={420}
        storageKey="live-transcript"
        initialPosition={{ x: 24, y: 24 }}
      >
        <div className="p-3">
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nothing transcribed yet…
            </p>
          ) : (
            <LiveThreadView
              entries={entries}
              threadTitles={threadTitles}
              getSpeakerName={getSpeakerName}
              getSpeakerAvatar={getSpeakerAvatar}
              bubble
              compact
              density="compact"
              showTimestamps={showTimestamps}
            />
          )}
        </div>
      </FloatingOverlay>
    </>
  );
};

export default FloatingTranscript;
