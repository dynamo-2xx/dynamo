import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useInsights } from "@/contexts/InsightsContext";
import { getPerfTag, POLARITY_STYLES, type Polarity } from "@/lib/perf-tags";
import type { PerfAnnotation } from "@/hooks/usePerformanceAnnotations";

/**
 * Renders the given text and, when Insights are enabled, overlays per-span
 * underlines + tag pills (with tooltips) for any annotations matching this
 * transcript_entry_id.
 */
interface Props {
  entryId: string | null | undefined;
  text: string;
  className?: string;
}

interface Segment {
  text: string;
  ann?: PerfAnnotation;
}

/** Walk the text, splitting on the earliest non-overlapping span matches. */
function buildSegments(text: string, anns: PerfAnnotation[]): Segment[] {
  if (anns.length === 0) return [{ text }];
  // Find every span occurrence (first hit only) and sort by position.
  const hits: Array<{ start: number; end: number; ann: PerfAnnotation }> = [];
  for (const a of anns) {
    if (!a.span_text) continue;
    const idx = text.indexOf(a.span_text);
    if (idx < 0) continue;
    hits.push({ start: idx, end: idx + a.span_text.length, ann: a });
  }
  hits.sort((a, b) => a.start - b.start);
  // Skip overlapping spans (keep earliest).
  const dedup: typeof hits = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start < cursor) continue;
    dedup.push(h);
    cursor = h.end;
  }
  if (dedup.length === 0) return [{ text }];
  const out: Segment[] = [];
  cursor = 0;
  for (const h of dedup) {
    if (h.start > cursor) out.push({ text: text.slice(cursor, h.start) });
    out.push({ text: text.slice(h.start, h.end), ann: h.ann });
    cursor = h.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}

const InsightText = ({ entryId, text, className }: Props) => {
  const ctx = useInsights();
  const anns = useMemo(() => {
    if (!ctx || !ctx.enabled || !entryId) return [];
    return ctx.byEntry.get(entryId) ?? [];
  }, [ctx, entryId]);

  const segments = useMemo(() => buildSegments(text, anns), [text, anns]);

  if (anns.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <span className={className}>
        {segments.map((s, i) =>
          s.ann ? (
            <InsightMark key={i} ann={s.ann}>
              {s.text}
            </InsightMark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </span>
    </TooltipProvider>
  );
};

const InsightMark = ({ ann, children }: { ann: PerfAnnotation; children: React.ReactNode }) => {
  const polarity: Polarity = ann.polarity ?? "negative";
  const styles = POLARITY_STYLES[polarity];
  const isDeep = ann.pass_kind === "deep";
  const tag = getPerfTag(ann.tag_label);
  const [pinned, setPinned] = useState(false);

  return (
    <Tooltip open={pinned ? true : undefined}>
      <TooltipTrigger asChild>
        <span
          className="inline"
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setPinned((p) => !p); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setPinned((p) => !p);
            }
          }}
        >
          <span className={`${styles.underline} cursor-help`}>{children}</span>
          <span
            className={`mx-1 inline-flex items-center gap-1 align-baseline rounded-full border px-1.5 py-0 text-[10px] font-medium leading-tight ${styles.pillBg} ${styles.pillText} cursor-help ${pinned ? "ring-1 ring-foreground/25" : ""}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            {ann.tag_label}
            {isDeep && (
              <span className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-500" title="Post-session insight" />
            )}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
        <div className="font-semibold mb-0.5">{ann.tag_label}</div>
        {tag?.description && <div className="text-[11px] opacity-80 mb-1">{tag.description}</div>}
        <div>{ann.explanation}</div>
        {tag?.guidance && (
          <div className="mt-1.5 pt-1.5 border-t border-border/40 text-[11px] opacity-80">{tag.guidance}</div>
        )}
        {isDeep && <div className="mt-1 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">Post-session</div>}
        {pinned && (
          <div className="mt-1 text-[10px] uppercase tracking-wide opacity-60">Click to unpin</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default InsightText;