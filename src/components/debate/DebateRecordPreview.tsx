import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Calendar as CalendarIcon, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { gradientFromSeed } from "@/lib/gradient";
import { cn } from "@/lib/utils";
import GhostStatementCard from "./preview/GhostStatementCard";
import { useDebatePreviewThreads, type PreviewStatement } from "@/hooks/useDebatePreviewThreads";

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

const speakerColorClass = (speakerLabel: string, labels: string[]): string => {
  // speakerLabel is like "Speaker 1 · Yes" — pull the index
  const m = speakerLabel.match(/Speaker\s+(\d+)/i);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    return SIDE_CLASS[idx % SIDE_CLASS.length];
  }
  // fallback: try to match against labels
  const idx = labels.findIndex((l) => speakerLabel.toLowerCase().includes(l.toLowerCase()));
  return SIDE_CLASS[(idx >= 0 ? idx : 0) % SIDE_CLASS.length];
};

const StatementRow = ({ s, labels }: { s: PreviewStatement; labels: string[] }) => {
  const isResponse = s.kind !== "main";
  const glyph = isResponse ? "↳" : "•";
  const label =
    s.kind === "main"
      ? "Main"
      : s.kind === "counter"
        ? "Counter"
        : s.kind === "rebuttal"
          ? "Rebuttal"
          : s.kind === "affirms"
            ? "Affirms"
            : "Concedes";
  const colorClass = speakerColorClass(s.speakerLabel, labels);
  return (
    <div className={cn("relative py-2", isResponse ? "pl-6" : "pl-3")}>
      <div className="flex items-baseline gap-2">
        <span className="text-foreground/40 select-none text-sm leading-none">{glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-medium mb-1">
            <span className="text-muted-foreground">{label}</span>{" "}
            <span className={cn("font-semibold", colorClass)}>— {s.speakerLabel}</span>
          </div>
          <p className="text-sm font-body text-foreground leading-relaxed" data-annotatable>
            {s.text}
          </p>
        </div>
      </div>
    </div>
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
}: DebateRecordPreviewProps) => {
  const { subtopics: liveSubs, sideLabels, loading } = useDebatePreviewThreads({
    debateId,
    status,
  });

  const subs = liveSubs.length > 0 ? liveSubs : fallbackSubtopics.map((s) => ({ ...s, threads: [] }));
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
                        : status === "completed"
                          ? "—"
                          : "Coming soon"}
                    </span>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="pl-6 pr-2 py-2 space-y-2">
                      {hasContent ? (
                        sub.threads.map((t) => (
                          <div key={t.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
                            <p className="text-xs font-display text-foreground/80 mb-1 leading-snug">
                              {t.title}
                            </p>
                            <div className="space-y-0.5">
                              {t.statements.map((s) => (
                                <StatementRow key={s.id} s={s} labels={labels} />
                              ))}
                            </div>
                            {sub.keyArguments.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-body font-medium">
                                  Argument summary
                                </p>
                                {sub.keyArguments.map((k, i) => (
                                  <p key={i} className="text-xs font-body text-foreground/80 leading-relaxed">
                                    <span className="font-semibold text-foreground/70">[{k.side}]</span>{" "}
                                    {k.content}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
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
