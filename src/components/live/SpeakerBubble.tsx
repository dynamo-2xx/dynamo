import { useState } from "react";
import { Scissors, Merge, AlertTriangle, Pencil } from "lucide-react";
import { LiveTranscriptEntry } from "@/hooks/useLiveTranscription";
import InsightText from "@/components/insights/InsightText";

interface SpeakerBubbleProps {
  entry: LiveTranscriptEntry;
  speakerName: string;
  readOnly?: boolean;
  onRenameSpeaker: (name: string) => void;
  onSplit: (splitIndex: number) => void;
  onMerge: () => void;
}

const SpeakerBubble = ({
  entry,
  speakerName,
  readOnly = false,
  onRenameSpeaker,
  onSplit,
  onMerge,
}: SpeakerBubbleProps) => {
  const [showTools, setShowTools] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(speakerName);
  const [showSplitPicker, setShowSplitPicker] = useState(false);

  const isLeft = entry.speaker_id % 2 === 0;

  const handleRenameSubmit = () => {
    if (renameValue.trim()) {
      onRenameSpeaker(renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div
      className={`flex ${isLeft ? "justify-start" : "justify-end"} mb-1.5`}
      onMouseEnter={() => !readOnly && setShowTools(true)}
      onMouseLeave={() => { if (!readOnly) { setShowTools(false); setShowSplitPicker(false); } }}
    >
      <div
        className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm relative group ${
          isLeft
            ? "bg-secondary text-foreground rounded-bl-sm"
            : "bg-primary/10 text-foreground rounded-br-sm"
        } ${entry.uncertain ? "ring-1 ring-yellow-500/30" : ""}`}
      >
        {/* Speaker label */}
        <div className="flex items-center gap-1 mb-0.5">
          {entry.uncertain && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              className="text-[10px] font-semibold bg-transparent border-b border-primary outline-none w-24"
            />
          ) : (
            <span
              className={`text-[10px] font-semibold text-muted-foreground ${!readOnly ? "cursor-pointer hover:text-primary" : ""}`}
              onClick={() => !readOnly && setIsRenaming(true)}
            >
              {speakerName}
            </span>
          )}
          {!readOnly && !isRenaming && showTools && (
            <button onClick={() => setIsRenaming(true)} className="text-muted-foreground hover:text-primary">
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Text */}
        {showSplitPicker && entry.words?.length ? (
          <div className="flex flex-wrap gap-0.5">
            {entry.words.map((w, i) => (
              <span
                key={i}
                onClick={() => { onSplit(i + 1); setShowSplitPicker(false); }}
                className="cursor-pointer hover:bg-primary/20 px-0.5 rounded text-sm transition-colors"
              >
                {w.word}
              </span>
            ))}
          </div>
        ) : (
          <InsightText entryId={entry.id} text={entry.text} />
        )}

        {/* Tool buttons */}
        {!readOnly && showTools && !showSplitPicker && (
          <div className={`flex gap-1 mt-1 ${isLeft ? "" : "justify-end"}`}>
            {entry.words && entry.words.length > 1 && (
              <button
                onClick={() => setShowSplitPicker(true)}
                className="text-[10px] flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
                title="Split at word boundary"
              >
                <Scissors className="w-3 h-3" />
              </button>
            )}
            {entry.uncertain && (
              <button
                onClick={onMerge}
                className="text-[10px] flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
                title="Merge with previous"
              >
                <Merge className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerBubble;
