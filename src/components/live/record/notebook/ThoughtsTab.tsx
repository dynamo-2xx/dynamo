import { Textarea } from "@/components/ui/textarea";
import ReaderNoteCard from "@/components/study/ReaderNoteCard";
import type { ReaderNote } from "@/hooks/useReaderNotes";

interface Props {
  thoughts: string;
  setThoughts: (v: string) => void;
  readerNotes?: ReaderNote[];
  onDismissReaderNote?: (id: string) => void;
  onJumpReaderNote?: (note: ReaderNote) => void;
}

const ThoughtsTab = ({
  thoughts,
  setThoughts,
  readerNotes,
  onDismissReaderNote,
  onJumpReaderNote,
}: Props) => {
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

  return (
    <div className="flex flex-col gap-3 h-full">
      {readerNotes && readerNotes.length > 0 && (
        <div className="space-y-2">
          {readerNotes.map((n) => (
            <ReaderNoteCard
              key={n.id}
              note={n}
              compact
              onDismiss={onDismissReaderNote ? () => onDismissReaderNote(n.id) : undefined}
              onJump={n.anchor_excerpt && onJumpReaderNote ? () => onJumpReaderNote(n) : undefined}
            />
          ))}
        </div>
      )}
      <Textarea
        value={thoughts}
        onChange={(e) => setThoughts(e.target.value)}
        onPaste={handlePaste}
        placeholder="Free-form thoughts. Paste images directly…"
        className="w-full flex-1 min-h-[240px] resize-none border-foreground/10 text-sm font-body"
      />
    </div>
  );
};

export default ThoughtsTab;