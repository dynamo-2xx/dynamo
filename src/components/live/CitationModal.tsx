import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LiveTranscriptEntry } from "@/hooks/useLiveTranscription";
import TranscriptCard from "@/components/debate/TranscriptCard";
import { groupConsecutiveEntries } from "@/utils/groupTranscriptEntries";
import { useIsMobile } from "@/hooks/use-mobile";

interface CitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "topic" | "quote";
  value: string;
  transcriptEntries: LiveTranscriptEntry[];
  subtopics: string[];
  speakerNames: Record<string, string>;
}

const CitationModal = ({
  open,
  onOpenChange,
  type,
  value,
  transcriptEntries,
  subtopics,
  speakerNames,
}: CitationModalProps) => {
  const isMobile = useIsMobile();
  const getSpeakerName = (id: number) => speakerNames[String(id)] || `Speaker ${id + 1}`;

  let matchedEntries: LiveTranscriptEntry[] = [];
  let title = "";

  if (type === "topic") {
    title = value;
    matchedEntries = transcriptEntries.filter(
      (e) => e.subtopic?.toLowerCase() === value.toLowerCase()
    );
  } else {
    title = "Quote";
    const searchLower = value.toLowerCase();
    matchedEntries = transcriptEntries.filter(
      (e) => e.text.toLowerCase().includes(searchLower)
    );
    if (matchedEntries.length === 0) {
      // Try partial match on first few words
      const words = searchLower.split(" ").slice(0, 5).join(" ");
      matchedEntries = transcriptEntries.filter(
        (e) => e.text.toLowerCase().includes(words)
      );
    }
  }

  const content = (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {matchedEntries.length > 0 ? (
        groupConsecutiveEntries(matchedEntries).map((entry) => (
          <TranscriptCard
            key={entry.id}
            speakerSide={getSpeakerName(entry.speaker_id)}
            sideOrder={entry.speaker_id % 2}
            text={entry.text}
            aiSummary={entry.ai_summary}
            timestamp={entry.timestamp}
            autoFlip
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No matching entries found for this citation.
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="text-sm font-display">{title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default CitationModal;
