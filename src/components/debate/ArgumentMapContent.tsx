import { useState } from "react";
import { ChevronDown, Pencil, Check, X, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import InsightText from "@/components/insights/InsightText";

export interface TranscriptEntryInput {
  id: string;
  speaker_side: string;
  text: string;
  subtopic: string;
  timestamp: number;
  ai_summary?: string;
}

export interface ArgumentMapEntryInput {
  id: string;
  type: "claim" | "argument" | "counter" | "stake" | "quote" | "evidence" | string;
  speaker_side: string;
  content: string;
  quote?: string;
  parent_index?: number;
  subtopic: string;
  created_at: number;
  original_content?: string;
  edited?: boolean;
}

export interface SubtopicInput {
  id: string;
  title: string;
}

interface AnalysisEntry {
  subtopicId: string;
  subtopicTitle: string;
  summary: string;
  keyArguments?: Array<{ side: string; content: string; type: string; significance: string }>;
}

interface ArgumentMapContentProps {
  tab: "threaded" | "transcript";
  subtopics: SubtopicInput[];
  transcriptEntries: TranscriptEntryInput[];
  argumentMap: ArgumentMapEntryInput[];
  analysis?: AnalysisEntry[];
  /** When true, render inside a flat container (e.g. prep window) instead of overlay padding. */
  inline?: boolean;
  /** When true, each threaded-record bubble exposes an inline edit affordance. */
  editable?: boolean;
  onEditEntry?: (id: string, newContent: string) => void | Promise<void>;
  onRevertEntry?: (id: string) => void | Promise<void>;
}

const typeChipColor = (t: string) => {
  switch (t) {
    case "counter":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "claim":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "argument":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
    case "stake":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "quote":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "evidence":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "bg-foreground/10 text-foreground/70";
  }
};

/** Build per-subtopic threads from argument-map entries by walking parent_index chains. */
function buildThreads(entries: ArgumentMapEntryInput[]) {
  const roots: Array<{ root: ArgumentMapEntryInput; children: ArgumentMapEntryInput[] }> = [];
  entries.forEach((e, i) => {
    if (e.parent_index === undefined || e.parent_index === null || e.parent_index < 0) {
      roots.push({ root: e, children: [] });
    }
  });
  // Attach each non-root entry to the nearest preceding root (best-effort).
  entries.forEach((e, i) => {
    if (e.parent_index === undefined || e.parent_index === null || e.parent_index < 0) return;
    const parent = entries[e.parent_index];
    const bucket = roots.find((r) => r.root === parent) ?? roots[roots.length - 1];
    if (bucket) bucket.children.push(e);
  });
  return roots;
}

const humanizeType = (value: string) => value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const threadTitle = (entry: ArgumentMapEntryInput, index: number) => {
  const side = entry.speaker_side || "Unattributed";
  const type = humanizeType(entry.type || "argument");
  return `${side} · ${type} ${index + 1}`;
};

/**
 * Inline editor for a single argument-map bubble. Used only in the prep
 * window. Transcript text is NEVER editable — only the AI-derived bubble copy.
 */
const EditableBubbleText = ({
  entry,
  onSave,
  onRevert,
}: {
  entry: ArgumentMapEntryInput;
  onSave: (id: string, newContent: string) => void | Promise<void>;
  onRevert?: (id: string) => void | Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.content);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="group/edit relative">
        <p className="text-xs text-foreground font-body leading-relaxed whitespace-pre-wrap pr-6" data-annotatable>
          <InsightText entryId={entry.id} text={entry.content} />
        </p>
        <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover/edit:opacity-100 transition-opacity">
          {entry.edited && entry.original_content && onRevert && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onRevert(entry.id);
              }}
              className="text-muted-foreground hover:text-foreground"
              title="Revert to AI original"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDraft(entry.content);
              setEditing(true);
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        {entry.edited && (
          <span className="ml-1 text-[9px] uppercase tracking-wide text-muted-foreground/80 align-middle">
            (edited)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.max(2, Math.min(8, Math.ceil(draft.length / 70)))}
        className="w-full bg-secondary/30 border border-border rounded-md px-2 py-1.5 text-xs text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
        autoFocus
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={saving || !draft.trim()}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(entry.id, draft);
              setEditing(false);
            } finally {
              setSaving(false);
            }
          }}
          className="text-[10px] flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 rounded font-semibold disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> Save
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(entry.content);
            setEditing(false);
          }}
          className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground px-2 py-0.5"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  );
};

const ArgumentMapContent = ({
  tab,
  subtopics,
  transcriptEntries,
  argumentMap,
  analysis = [],
  inline = false,
  editable = false,
  onEditEntry,
  onRevertEntry,
}: ArgumentMapContentProps) => {
  const padding = inline ? "" : "px-3 py-3";

  // If no subtopics were passed but we have data, synthesize from the data itself.
  const subtopicList: SubtopicInput[] =
    subtopics.length > 0
      ? subtopics
      : Array.from(
          new Set([
            ...transcriptEntries.map((t) => t.subtopic),
            ...argumentMap.map((a) => a.subtopic),
          ]),
        )
          .filter(Boolean)
          .map((title) => ({ id: title, title }));

  if (tab === "threaded") {
    const analysisByTitle = new Map(analysis.map((a) => [a.subtopicTitle, a]));

    return (
      <div className={`${padding} space-y-2`} data-annotatable>
        {subtopicList.length === 0 ? (
          <p className="text-xs italic text-muted-foreground py-4 text-center">
            No subtopics yet. The threaded record appears here as the debate progresses.
          </p>
        ) : (
          subtopicList.map((st, idx) => {
            const stMap = argumentMap.filter((a) => a.subtopic === st.title);
            const threads = buildThreads(stMap);
            const a = analysisByTitle.get(st.title);
            const isEmpty = threads.length === 0;
            return (
              <Collapsible key={st.id} defaultOpen={idx === 0}>
                <CollapsibleTrigger className="w-full flex items-center justify-between border border-foreground/10 rounded-lg px-3 py-2 bg-background/40 hover:bg-background/60 transition-colors">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                    {idx + 1}. {st.title}
                  </p>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {threads.length} {threads.length === 1 ? "thread" : "threads"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-x border-b border-foreground/10 rounded-b-lg px-3 py-2 bg-background/30 -mt-px space-y-2">
                  {isEmpty ? (
                    <p className="text-[11px] italic text-muted-foreground py-2">
                      No analyzed arguments yet for this subtopic.
                    </p>
                  ) : (
                    threads.map((th, ti) => (
                      <Collapsible key={`${st.id}-th-${ti}`}>
                        <CollapsibleTrigger className="w-full flex items-start gap-2 px-2 py-1.5 text-left hover:bg-foreground/[0.03] transition-colors rounded">
                          <ChevronDown className="w-3.5 h-3.5 text-foreground/40 shrink-0 mt-0.5 transition-transform [[data-state=closed]_&]:-rotate-90" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                              {threadTitle(th.root, ti)}
                            </p>
                            <p className="text-xs text-foreground/70 font-body leading-snug">
                              {th.children.length} repl{th.children.length === 1 ? "y" : "ies"}
                            </p>
                          </div>
                          <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded shrink-0 ${typeChipColor(th.root.type)}`}>
                            {th.root.type}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-5 py-1 space-y-1.5">
                          {editable && onEditEntry ? (
                            <EditableBubbleText
                              entry={th.root}
                              onSave={onEditEntry}
                              onRevert={onRevertEntry}
                            />
                          ) : (
                            <>
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-body mb-0.5">
                                {th.root.speaker_side}
                              </p>
                              <p className="text-xs text-foreground font-body leading-relaxed whitespace-pre-wrap" data-annotatable>
                                <InsightText entryId={th.root.id} text={th.root.content} />
                                {th.root.edited && (
                                  <span className="ml-1 text-[9px] uppercase tracking-wide text-muted-foreground/80">
                                    (edited)
                                  </span>
                                )}
                              </p>
                            </>
                          )}
                          {th.root.quote && (
                            <p className="text-[11px] italic text-muted-foreground border-l-2 border-foreground/15 pl-2" data-annotatable>
                              "{th.root.quote}"
                            </p>
                          )}
                          {th.children.map((c) => (
                            <div key={c.id} className="border-l-2 border-foreground/15 pl-2 py-1">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                                  {c.speaker_side}
                                </p>
                                <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded ${typeChipColor(c.type)}`}>
                                  {c.type}
                                </span>
                              </div>
                              {editable && onEditEntry ? (
                                <EditableBubbleText
                                  entry={c}
                                  onSave={onEditEntry}
                                  onRevert={onRevertEntry}
                                />
                              ) : (
                                <p className="text-xs text-foreground font-body leading-relaxed whitespace-pre-wrap" data-annotatable>
                                  <InsightText entryId={c.id} text={c.content} />
                                  {c.edited && (
                                    <span className="ml-1 text-[9px] uppercase tracking-wide text-muted-foreground/80">
                                      (edited)
                                    </span>
                                  )}
                                </p>
                              )}
                              {c.quote && (
                                <p className="text-[11px] italic text-muted-foreground mt-0.5" data-annotatable>
                                  "{c.quote}"
                                </p>
                              )}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                  {a && a.summary && (
                    <div className="border-t border-foreground/10 pt-2 mt-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body mb-1">
                        Round summary
                      </p>
                      <p className="text-xs text-foreground/85 font-body leading-relaxed" data-annotatable>
                        {a.summary}
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>
    );
  }

  // Transcript tab — collapsible per subtopic.
  return (
    <div className={`${padding} space-y-2`} data-annotatable>
      {subtopicList.length === 0 ? (
        <p className="text-xs italic text-muted-foreground py-4 text-center">
          No transcript yet. Entries appear here as the debate progresses.
        </p>
      ) : (
        subtopicList.map((st, idx) => {
          const stEntries = transcriptEntries
            .filter((e) => e.subtopic === st.title)
            .sort((a, b) => a.timestamp - b.timestamp);
          return (
            <Collapsible key={st.id} defaultOpen={idx === 0}>
              <CollapsibleTrigger className="w-full flex items-center justify-between border border-foreground/10 rounded-lg px-3 py-2 bg-background/40 hover:bg-background/60 transition-colors">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                  {idx + 1}. {st.title}
                </p>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{stEntries.length}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-x border-b border-foreground/10 rounded-b-lg px-3 py-2 bg-background/30 -mt-px space-y-2">
                {stEntries.length === 0 ? (
                  <p className="text-[11px] italic text-muted-foreground py-1">No entries yet.</p>
                ) : (
                  stEntries.map((e) => (
                    <div key={e.id} className="border-l-2 border-foreground/15 pl-3 py-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body mb-0.5">
                        {e.speaker_side}
                      </p>
                      <p className="text-xs text-foreground font-body leading-relaxed whitespace-pre-wrap" data-annotatable>
                        <InsightText entryId={e.id} text={e.text} />
                      </p>
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })
      )}
    </div>
  );
};

export default ArgumentMapContent;