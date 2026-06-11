import { useMemo } from "react";
import { ChevronDown, CornerDownRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LiveTranscriptEntry, LiveThreadMeta } from "@/hooks/useLiveTranscription";
import TranscriptCard from "@/components/debate/TranscriptCard";
import LiveTranscriptBubble from "@/components/live/LiveTranscriptBubble";
import { groupConsecutiveEntries } from "@/utils/groupTranscriptEntries";
/** Density preset for transcript layout. Defined here now that the live
 * display-prefs hook is gone — kept as a public type because shared
 * components still parameterize on it (e.g. FloatingTranscript). */
export type TranscriptDensity = "comfortable" | "compact" | "cinema";

interface LiveThreadViewProps {
  entries: LiveTranscriptEntry[];
  threadTitles: Record<string, LiveThreadMeta>;
  getSpeakerName: (speakerId: number) => string;
  getSpeakerAvatar?: (speakerId: number) => string | null | undefined;
  compact?: boolean;
  bubble?: boolean;
  density?: TranscriptDensity;
  showTimestamps?: boolean;
}

interface ThreadGroup {
  threadId: string;
  title: string;
  entries: LiveTranscriptEntry[];
}

/**
 * Renders entries (already scoped to a subtopic) as collapsible argument threads.
 * - Each thread gets a row with a title + entry count, collapsed by default.
 * - Expanding shows the threaded transcript cards (counters indented, with a label).
 * - Falls back to a flat list when entries lack thread_id (old sessions).
 */
const LiveThreadView = ({
  entries,
  threadTitles,
  getSpeakerName,
  getSpeakerAvatar,
  compact = false,
  bubble = false,
  density = "comfortable",
  showTimestamps = true,
}: LiveThreadViewProps) => {
  const { threads, unthreaded } = useMemo(() => {
    const threadMap: Record<string, LiveTranscriptEntry[]> = {};
    const unthreadedEntries: LiveTranscriptEntry[] = [];

    for (const e of entries) {
      if (e.thread_id) {
        if (!threadMap[e.thread_id]) threadMap[e.thread_id] = [];
        threadMap[e.thread_id].push(e);
      } else {
        unthreadedEntries.push(e);
      }
    }

    // Order threads by first-appearance timestamp
    const ordered: ThreadGroup[] = Object.entries(threadMap)
      .map(([threadId, ents]) => {
        const sorted = [...ents].sort((a, b) => a.timestamp - b.timestamp);
        const meta = threadTitles[threadId];
        const title = meta?.title || (sorted.length >= 2 ? "Untitled thread" : "New thread");
        return { threadId, title, entries: sorted, firstTs: sorted[0]?.timestamp || 0 };
      })
      .sort((a, b) => a.firstTs - b.firstTs)
      .map(({ threadId, title, entries }) => ({ threadId, title, entries }));

    return { threads: ordered, unthreaded: unthreadedEntries };
  }, [entries, threadTitles]);

  // Old-session fallback: nothing has thread_id → flat list
  if (threads.length === 0 && unthreaded.length > 0) {
    return (
      <div className="space-y-2">
        {groupConsecutiveEntries(unthreaded).map((entry) =>
          bubble ? (
            <LiveTranscriptBubble
              key={entry.id}
              speakerName={getSpeakerName(entry.speaker_id)}
              avatarUrl={getSpeakerAvatar?.(entry.speaker_id)}
              text={entry.text}
              timestamp={entry.timestamp}
              density={density}
              showTimestamp={showTimestamps}
            />
          ) : (
            <TranscriptCard
              key={entry.id}
              speakerSide={getSpeakerName(entry.speaker_id)}
              sideOrder={entry.speaker_id % 2}
              text={entry.text}
              aiSummary={entry.ai_summary}
              timestamp={entry.timestamp}
              autoFlip
              compact={compact}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((thread) => {
        const grouped = groupConsecutiveEntries(thread.entries);
        // Identify the root (first argument) for visual hierarchy
        const rootEntryId = thread.entries.find((e) => e.thread_role === "argument")?.id
          || thread.entries[0]?.id;

        return (
          <Collapsible key={thread.threadId}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border/70 bg-background px-4 py-2.5 text-left hover:bg-accent/40 transition-colors group">
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
              <span className="text-sm font-medium text-foreground flex-1 truncate">
                {thread.title}
              </span>
              <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                {thread.entries.length} {thread.entries.length === 1 ? "statement" : "statements"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 pr-1 py-2 space-y-2 border-l-2 border-border/40 ml-3 mt-1">
                {grouped.map((entry, idx) => {
                  const original = thread.entries.find((e) => e.id === entry.id);
                  const role = original?.thread_role;
                  const isCounter = role === "counter";
                  const isRoot = entry.id === rootEntryId;

                  return (
                    <div key={entry.id} className={isCounter ? "pl-4" : ""}>
                      {isCounter && (
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary font-semibold mb-1 -ml-3">
                          <CornerDownRight className="w-3 h-3" />
                          Counter
                        </div>
                      )}
                      {!isCounter && !isRoot && idx > 0 && (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Continuation
                        </div>
                      )}
                      <TranscriptCard
                        speakerSide={getSpeakerName(entry.speaker_id)}
                        sideOrder={entry.speaker_id % 2}
                        text={entry.text}
                        aiSummary={entry.ai_summary}
                        timestamp={entry.timestamp}
                        autoFlip
                        compact={compact}
                      />
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {unthreaded.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-dashed border-border/50 bg-background px-4 py-2.5 text-left hover:bg-accent/30 transition-colors">
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
            <span className="text-sm font-medium text-muted-foreground flex-1 italic">
              Unthreaded statements
            </span>
            <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
              {unthreaded.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-4 pr-1 py-2 space-y-2 border-l-2 border-dashed border-border/30 ml-3 mt-1">
              {groupConsecutiveEntries(unthreaded).map((entry) => (
                <TranscriptCard
                  key={entry.id}
                  speakerSide={getSpeakerName(entry.speaker_id)}
                  sideOrder={entry.speaker_id % 2}
                  text={entry.text}
                  aiSummary={entry.ai_summary}
                  timestamp={entry.timestamp}
                  autoFlip
                  compact={compact}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default LiveThreadView;
