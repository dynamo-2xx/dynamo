import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Calendar as CalendarIcon, Users, Download, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { gradientFromSeed } from "@/lib/gradient";
import { cn } from "@/lib/utils";
import GhostStatementCard from "./preview/GhostStatementCard";
import { useDebatePreviewThreads } from "@/hooks/useDebatePreviewThreads";

interface DebateRecordPreviewProps {
  debateId: string;
  topic: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  coverImageUrl?: string | null;
  publisherName?: string | null;
  participantCount?: number;
  /** Fallback subtopic titles (for when threads hook is still loading or for ghost rendering). */
  fallbackSubtopics?: { id: string; title: string }[];
  /** Side labels used for ghost speakers when no live data exists. */
  fallbackSideLabels?: string[];
  importedSourceUrl?: string | null;
  importedSourceKind?: string | null;
}

const StatusPill = ({ status }: { status: string }) => {
  const isLive = status === "live";
  const isCompleted = status === "completed";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-body font-semibold uppercase tracking-wider border",
        isLive
          ? "bg-red-500/10 text-red-500 border-red-500/30"
          : "bg-background/95 text-foreground border-border",
      )}
    >
      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
      {isLive ? "Live now" : isCompleted ? "Completed" : status === "scheduled" ? "Scheduled" : "Upcoming"}
    </span>
  );
};

const SIDE_CLASS = [
  "text-blue-600 dark:text-blue-400",
  "text-rose-600 dark:text-rose-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
];

const sideColorClass = (sideLabel: string, labels: string[]): string => {
  const idx = labels.findIndex((l) => l.toLowerCase() === sideLabel.toLowerCase());
  return SIDE_CLASS[(idx >= 0 ? idx : 0) % SIDE_CLASS.length];
};

const tagClass = (type?: string) => {
  switch ((type || "").toLowerCase()) {
    case "counter":
    case "rebuttal":
      return "bg-destructive/10 text-destructive";
    case "stake":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "quote":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "evidence":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "bg-primary/10 text-primary";
  }
};

const SummaryItem = ({
  summary,
  colorClass,
}: {
  summary: { id: string; content: string; type?: string; significance?: string; originalContent?: string; isEdited?: boolean };
  colorClass: string;
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const displayed =
    summary.isEdited && showOriginal && summary.originalContent
      ? summary.originalContent
      : summary.content;
  return (
    <li className="flex items-start gap-2">
      <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-current", colorClass)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body text-foreground/90 leading-relaxed" data-annotatable>
          {displayed}
        </p>
        {(summary.type || summary.significance) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {summary.type && (
              <span className={cn("text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded", tagClass(summary.type))}>
                {summary.type}
              </span>
            )}
            {summary.significance && (
              <span className="text-[10px] text-muted-foreground line-clamp-1">
                {summary.significance}
              </span>
            )}
          </div>
        )}
        {summary.isEdited && (
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle original / edited"
          >
            <RotateCcw className="w-3 h-3" />
            {showOriginal ? "original" : "edited"}
          </button>
        )}
      </div>
    </li>
  );
};

const DebateRecordPreview = ({
  debateId,
  topic,
  description,
  status,
  scheduledAt,
  coverImageUrl,
  publisherName,
  participantCount,
  fallbackSubtopics = [],
  fallbackSideLabels = [],
  importedSourceUrl = null,
  importedSourceKind = null,
}: DebateRecordPreviewProps) => {
  const { subtopics: liveSubs, sideLabels, loading } = useDebatePreviewThreads({
    debateId,
    status,
  });

  const subs = liveSubs.length > 0
    ? liveSubs
    : fallbackSubtopics.map((s) => ({ ...s, threads: [], hasSummaries: false }));
  const labels = sideLabels.length > 0 ? sideLabels : fallbackSideLabels;
  const ghostLabelA = labels[0] ? `Speaker 1 · ${labels[0]}` : "Speaker 1";
  const ghostLabelB = labels[1] ? `Speaker 2 · ${labels[1]}` : "Speaker 2";

  const heroStyle = useMemo(
    () =>
      coverImageUrl
        ? {
            backgroundImage: `url(${coverImageUrl})`,
            backgroundSize: "cover" as const,
            backgroundPosition: "center" as const,
          }
        : { backgroundImage: gradientFromSeed(topic) },
    [coverImageUrl, topic],
  );

  const scheduledLabel = scheduledAt
    ? new Date(scheduledAt).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Hero */}
      <div
        className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-border shadow-sm"
        style={heroStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-center gap-2 mb-3">
            <StatusPill status={status} />
            {(importedSourceUrl || importedSourceKind) && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-semibold uppercase tracking-wider border bg-background/95 text-foreground border-border"
                title={importedSourceUrl ?? undefined}
              >
                <Download className="w-3 h-3" />
                Imported
              </span>
            )}
            {scheduledLabel && (
              <span className="text-white/90 text-[11px] font-body inline-flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {scheduledLabel}
              </span>
            )}
          </div>
          <h1 className="font-display text-white text-2xl sm:text-3xl leading-tight drop-shadow">
            {topic}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-white/80 text-xs font-body">
            {publisherName && <span>by {publisherName}</span>}
            {typeof participantCount === "number" && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {participantCount} participant{participantCount === 1 ? "" : "s"}
              </span>
            )}
            {importedSourceUrl && (
              <a
                href={importedSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline truncate max-w-[18rem]"
              >
                source: {(() => {
                  try { return new URL(importedSourceUrl).hostname.replace(/^www\./, ""); }
                  catch { return importedSourceUrl; }
                })()}
              </a>
            )}
            {!importedSourceUrl && importedSourceKind && (
              <span className="inline-flex items-center gap-1">
                source: {importedSourceKind}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      {description && (
        <details className="group border border-border rounded-xl overflow-hidden bg-card">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-accent/40 transition-colors">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
              About this debate
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 text-sm font-body text-foreground whitespace-pre-wrap" data-annotatable>
            {description}
          </div>
        </details>
      )}

      {/* Sides */}
      {labels.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {labels.map((lbl, i) => (
            <div
              key={`${lbl}-${i}`}
              className={cn(
                "rounded-xl border border-border bg-card px-4 py-3 text-center",
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-1">
                Side {i + 1}
              </p>
              <p className={cn("text-sm font-display", SIDE_CLASS[i % SIDE_CLASS.length])}>{lbl}</p>
            </div>
          ))}
        </div>
      )}

      {/* Threaded record */}
      <div>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-body font-medium">
            Threaded record
          </h2>
          <span className="text-[10px] text-muted-foreground/70 font-body">
            {status === "live"
              ? "Live · updates as the debate unfolds"
              : status === "completed"
                ? "Final"
                : "Preview"}
          </span>
        </div>

        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic px-2 py-6">
            {loading ? "Loading subtopics…" : "No subtopics defined."}
          </p>
        ) : (
          <div className="space-y-2 rounded-2xl border border-border bg-card/40 p-2">
            {subs.map((sub, idx) => {
              const hasContent = sub.threads.length > 0;
              const isLocked = !hasContent && status === "completed";
              if (isLocked) {
                return (
                  <div
                    key={sub.id}
                    title="No discussion happened on this subtopic"
                    className="flex items-start gap-2 w-full px-3 py-3 text-left rounded-lg opacity-40 cursor-not-allowed select-none"
                  >
                    <ChevronDown className="w-4 h-4 text-foreground/50 shrink-0 mt-0.5 -rotate-90" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base text-foreground leading-snug">
                        {idx + 1}. {sub.title}
                      </h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                      Not engaged
                    </span>
                  </div>
                );
              }
              return (
                <Collapsible key={sub.id} defaultOpen={idx === 0 && hasContent}>
                  <CollapsibleTrigger className="flex items-start gap-2 w-full px-3 py-3 text-left hover:bg-foreground/[0.03] rounded-lg transition-colors">
                    <ChevronDown className="w-4 h-4 text-foreground/50 shrink-0 mt-0.5 transition-transform [[data-state=closed]_&]:-rotate-90" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base text-foreground leading-snug">
                        {idx + 1}. {sub.title}
                      </h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                      {hasContent
                        ? `${sub.threads.length} thread${sub.threads.length === 1 ? "" : "s"}`
                        : "Coming soon"}
                    </span>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="pl-6 pr-2 py-2 space-y-2">
                      {hasContent ? (
                        sub.threads.map((t) => {
                          const colorClass = sideColorClass(t.title, labels);
                          return (
                            <Collapsible key={t.id}>
                              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-foreground/[0.04] rounded-lg border border-border/60 bg-background/60 transition-colors">
                                <ChevronDown className="w-3.5 h-3.5 text-foreground/40 shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                                <span className={cn("text-xs font-display font-semibold flex-1 truncate", colorClass)}>
                                  {t.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {t.summaries.length} summar{t.summaries.length === 1 ? "y" : "ies"}
                                </span>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <ul className="pl-7 pr-3 py-2 space-y-2">
                                  {t.summaries.map((s) => (
                                    <SummaryItem key={s.id} summary={s} colorClass={colorClass} />
                                  ))}
                                </ul>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })
                      ) : status === "live" || status === "completed" ? (
                        <p className="text-xs text-muted-foreground italic px-2 py-3">
                          Summaries pending.
                        </p>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-body mb-2">
                            Preview · how this subtopic will look
                          </p>
                          <GhostStatementCard kind="main" speakerLabel={ghostLabelA} />
                          <GhostStatementCard kind="counter" speakerLabel={ghostLabelB} />
                          <GhostStatementCard kind="affirms" speakerLabel={ghostLabelA} />
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DebateRecordPreview;
