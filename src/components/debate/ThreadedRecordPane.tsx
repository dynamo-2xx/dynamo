import { useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useArgumentUnits, triggerStructurePass, type ArgumentUnit } from "@/hooks/useArgumentUnits";

type SessionKind = "debate" | "cmm" | "live" | "imported";

interface ThreadedRecordPaneProps {
  sessionId: string;
  sessionKind: SessionKind;
  /** When true, kick the live structural pass on mount if no units exist yet. */
  autoTrigger?: boolean;
  /** Force the final pass on mount (post-session). */
  triggerFinal?: boolean;
  inline?: boolean;
}

/** Order parts in a reading-friendly flow regardless of model emission order. */
const PART_ORDER = ["CLAIM", "GROUNDS", "WARRANT", "QUALIFIER", "CONCESSION", "REBUTTAL"] as const;

function InlineAnatomyParagraph({
  anatomy,
}: {
  anatomy: Array<{ part: string; text: string; note?: string }>;
}) {
  // Split present (has text) vs. absent (note-only diagnostic).
  const present = anatomy.filter((p) => p.text && p.text.trim().length > 0);
  const absent = anatomy.filter((p) => (!p.text || !p.text.trim()) && p.note);

  // Sort present parts by canonical reading order, keeping unknown parts at the end.
  const sorted = [...present].sort((a, b) => {
    const ai = PART_ORDER.indexOf(a.part as any);
    const bi = PART_ORDER.indexOf(b.part as any);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-foreground font-body leading-relaxed">
        {sorted.map((p, i) => (
          <span key={i} className="inline">
            {i > 0 ? " " : null}
            <span className="inline">{p.text}</span>
            <span
              className="mx-1 inline-flex items-center align-baseline rounded-full border border-foreground/10 bg-foreground/[0.04] px-1.5 py-0 text-[10px] font-medium leading-tight text-foreground/55 cursor-help"
              title={p.note ?? p.part}
            >
              {p.part.toLowerCase()}
            </span>
          </span>
        ))}
      </p>
      {absent.length > 0 && (
        <div className="space-y-0.5">
          {absent.map((p, i) => (
            <p key={i} className="text-[10px] italic text-muted-foreground/70 font-body">
              {p.note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function AnatomyCard({ unit }: { unit: ArgumentUnit }) {
  const speaker = unit.speaker_label ?? unit.speaker_side ?? "Speaker";
  const side = unit.speaker_side && unit.speaker_side !== "unknown" ? unit.speaker_side : null;

  return (
    <div
      className={`border border-foreground/10 rounded-lg px-3 py-2 bg-background/60 ${
        unit.is_standalone_concession ? "ml-4 border-dashed bg-foreground/[0.02]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
          {speaker}{side ? ` · ${side}` : ""}
        </p>
        {unit.is_standalone_concession && (
          <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/60">
            standalone concession
          </span>
        )}
      </div>
      {unit.anatomy.length === 0 ? (
        <p className="text-xs text-foreground/80 font-body leading-relaxed whitespace-pre-wrap">
          {unit.source_text}
        </p>
      ) : (
        <InlineAnatomyParagraph anatomy={unit.anatomy} />
      )}
      {unit.relationship_tag === "UNRESOLVED" && (
        <p className="mt-1.5 text-[10px] italic text-muted-foreground/80 font-body">
          unresolved — this point was not addressed.
        </p>
      )}
    </div>
  );
}

function RelationshipConnector({ tag, note }: { tag: string; note?: string | null }) {
  return (
    <div className="flex items-center gap-2 pl-2 my-1 group/conn">
      <span className="block w-px h-3 bg-foreground/15" />
      <span
        className="text-[9px] uppercase tracking-widest font-semibold text-foreground/55 px-1.5 py-0.5 rounded bg-foreground/[0.04] cursor-help"
        title={note ?? undefined}
      >
        {tag.toLowerCase()}
      </span>
      {note && (
        <span className="text-[10px] text-muted-foreground/80 font-body opacity-0 group-hover/conn:opacity-100 transition-opacity truncate max-w-[260px]">
          {note}
        </span>
      )}
    </div>
  );
}

const ThreadedRecordPane = ({
  sessionId,
  sessionKind,
  autoTrigger = true,
  triggerFinal = false,
  inline = false,
}: ThreadedRecordPaneProps) => {
  const { units, loading } = useArgumentUnits(sessionId, sessionKind);

  useEffect(() => {
    if (!sessionId) return;
    if (triggerFinal) {
      triggerStructurePass(sessionId, sessionKind, "structure_final");
    } else if (autoTrigger && units.length === 0 && !loading) {
      triggerStructurePass(sessionId, sessionKind, "structure_live");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionKind, triggerFinal]);

  /** Group → subtopic_title → thread_id → ordered units. */
  const groups = useMemo(() => {
    const bySub = new Map<string, Map<string, ArgumentUnit[]>>();
    for (const u of units) {
      const sub = u.subtopic_title ?? "(general)";
      if (!bySub.has(sub)) bySub.set(sub, new Map());
      const threads = bySub.get(sub)!;
      if (!threads.has(u.thread_id)) threads.set(u.thread_id, []);
      threads.get(u.thread_id)!.push(u);
    }
    return Array.from(bySub.entries()).map(([sub, threadMap]) => ({
      subtopic_title: sub,
      threads: Array.from(threadMap.values()).map((arr) =>
        [...arr].sort((a, b) => a.turn_index - b.turn_index),
      ),
    }));
  }, [units]);

  const padding = inline ? "" : "px-3 py-3";

  if (loading && units.length === 0) {
    return (
      <div className={`${padding} text-xs italic text-muted-foreground py-4 text-center`}>
        Loading threaded record…
      </div>
    );
  }
  if (units.length === 0) {
    return (
      <div className={`${padding} text-xs italic text-muted-foreground py-4 text-center`}>
        The threaded record assembles automatically. This may take a moment.
      </div>
    );
  }

  return (
    <div className={`${padding} space-y-2`}>
      {groups.map((g, gi) => (
        <Collapsible key={`${g.subtopic_title}-${gi}`} defaultOpen={gi === 0}>
          <CollapsibleTrigger className="w-full flex items-center justify-between border border-foreground/10 rounded-lg px-3 py-2 bg-background/40 hover:bg-background/60 transition-colors">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
              {gi + 1}. {g.subtopic_title}
            </p>
            <span className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {g.threads.length} {g.threads.length === 1 ? "thread" : "threads"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-x border-b border-foreground/10 rounded-b-lg px-3 py-2 bg-background/30 -mt-px space-y-2">
            {g.threads.map((thread, ti) => {
              const anchor = thread[0];
              const anchorProposition = anchor?.relationship_note ?? anchor?.source_text?.slice(0, 80) ?? "";
              return (
                <Collapsible key={`th-${ti}`} defaultOpen={ti === 0}>
                  <CollapsibleTrigger className="w-full flex items-start gap-2 px-2 py-1.5 text-left hover:bg-foreground/[0.03] transition-colors rounded">
                    <ChevronDown className="w-3.5 h-3.5 text-foreground/40 shrink-0 mt-0.5 transition-transform [[data-state=closed]_&]:-rotate-90" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                        Thread {ti + 1} · {thread.length} {thread.length === 1 ? "unit" : "units"}
                      </p>
                      <p className="text-xs text-foreground/75 font-body leading-snug truncate">
                        {anchorProposition}
                      </p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-5 py-1 space-y-0">
                    {thread.map((u, ui) => (
                      <div key={u.id}>
                        {ui > 0 && (
                          <RelationshipConnector tag={u.relationship_tag} note={u.relationship_note} />
                        )}
                        <AnatomyCard unit={u} />
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

export default ThreadedRecordPane;