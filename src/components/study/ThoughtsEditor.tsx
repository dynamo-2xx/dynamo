import RichTextEditor, { type Editor } from "./RichTextEditor";
import ReaderNoteCard from "@/components/study/ReaderNoteCard";
import type { ReaderNote } from "@/hooks/useReaderNotes";

interface Props {
  thoughts: string;
  setThoughts: (v: string) => void;
  onEditorReady?: (e: Editor | null) => void;
  onFocus?: () => void;
  editable?: boolean;
  readerNotes?: ReaderNote[];
  onDismissReaderNote?: (id: string) => void;
  onJumpReaderNote?: (note: ReaderNote) => void;
}

const ThoughtsEditor = ({
  thoughts,
  setThoughts,
  onEditorReady,
  onFocus,
  editable = true,
  readerNotes,
  onDismissReaderNote,
  onJumpReaderNote,
}: Props) => {
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
      <RichTextEditor
        value={thoughts}
        onChange={setThoughts}
        onEditorReady={onEditorReady}
        onFocus={onFocus}
        editable={editable}
        placeholder={editable ? "Free-form thoughts. Paste images directly…" : undefined}
        minHeight="280px"
      />
    </div>
  );
};

export default ThoughtsEditor;