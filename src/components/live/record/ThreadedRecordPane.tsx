import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { buildHierarchy } from "./types";
import type { LiveTranscriptEntry, LiveSummary, LiveThreadMeta } from "@/hooks/useLiveTranscription";
import type { SessionCitation } from "@/hooks/useSessionCitations";
import type { SessionCrossRef } from "@/hooks/useSessionCrossRefs";
import SummaryCard from "./SummaryCard";

interface ThreadedRecordPaneProps {
  transcriptEntries: LiveTranscriptEntry[];
  subtopics: string[];
  threadTitles: Record<string, LiveThreadMeta>;
  summaries: LiveSummary[];
  getSpeakerName: (speakerId: number) => string;
  onJumpToTranscript: (entryIds: string[]) => void;
  isHost?: boolean;
  citationByNode?: (node_id: string) => SessionCitation | null;
  onSaveCitation?: (node_id: string, text: string, url: string) => void;
  onDeleteCitation?: (node_id: string) => void;
  refsByNode?: Map<string, SessionCrossRef[]>;
  numberByRefId?: Map<string, number>;
  onJumpToCrossRef?: (toNodeId: string) => void;
}

/**
 * Left pane: hierarchical Subtopic → Thread → Role-group summary view.
 * - Subtopics collapsed by default (chevron right).
 * - Threads collapsed inside subtopics.
 * - Summaries always visible when a thread is open.
 */
const ThreadedRecordPane = ({
  transcriptEntries,
  subtopics,
  threadTitles,
  summaries,
  getSpeakerName,
  onJumpToTranscript,
  isHost,
  citationByNode,
  onSaveCitation,
  onDeleteCitation,
  refsByNode,
  numberByRefId,
  onJumpToCrossRef,
}: ThreadedRecordPaneProps) => {
  const hierarchy = useMemo(
    () => buildHierarchy({ transcriptEntries, subtopics, threadTitles, summaries, getSpeakerName }),
    [transcriptEntries, subtopics, threadTitles, summaries, getSpeakerName],
  );

  if (hierarchy.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic px-2 py-6">
        No subtopics identified yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {hierarchy.map((sub, idx) => (
        <Collapsible key={`${sub.subtopic}-${idx}`}>
          <CollapsibleTrigger className="flex items-start gap-2 w-full px-2 py-3 text-left hover:bg-foreground/[0.02] transition-colors border-b border-foreground/10">
            <ChevronDown className="w-4 h-4 text-foreground/50 shrink-0 mt-0.5 transition-transform [[data-state=closed]_&]:-rotate-90" />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base text-foreground leading-snug">
                {idx + 1}. {sub.subtopic}
              </h3>
              {sub.description && (
                <p className="text-xs text-muted-foreground mt-0.5 font-body">{sub.description}</p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
              {sub.threads.length} {sub.threads.length === 1 ? "thread" : "threads"}
            </span>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="pl-6 pr-2 py-2 space-y-1">
              {sub.threads.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">No threads yet.</p>
              ) : (
                sub.threads.map((thread) => (
                  <Collapsible key={thread.thread_id}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-2 text-left hover:bg-foreground/[0.02] transition-colors border-b border-foreground/[0.06]">
                      <ChevronDown className="w-3.5 h-3.5 text-foreground/40 shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                      <span className="font-display text-sm text-foreground/90 flex-1 truncate">
                        {thread.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {thread.summaries.length}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-2 py-1">
                        {thread.summaries.map((s) => (
                          <SummaryCard
                            key={s.node_id}
                            summary={s}
                            speakerName={getSpeakerName(s.speaker_id)}
                            sourceEntries={thread.entries.filter((e) =>
                              s.source_entry_ids.includes(e.id),
                            )}
                            onJumpToTranscript={onJumpToTranscript}
                            citation={citationByNode?.(s.node_id) || null}
                            isHost={isHost}
                            onSaveCitation={
                              onSaveCitation
                                ? (text, url) => onSaveCitation(s.node_id, text, url)
                                : undefined
                            }
                            onDeleteCitation={
                              onDeleteCitation ? () => onDeleteCitation(s.node_id) : undefined
                            }
                            crossRefs={refsByNode?.get(s.node_id) || []}
                            numberByRefId={numberByRefId}
                            onJumpToCrossRef={onJumpToCrossRef}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

export default ThreadedRecordPane;