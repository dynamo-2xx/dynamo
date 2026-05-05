import { ReactNode, useMemo } from "react";
import { ChevronDown, Clock, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import GhostStatementCard from "./preview/GhostStatementCard";
import { useDebatePreviewThreads, type PreviewStatement } from "@/hooks/useDebatePreviewThreads";
import { cn } from "@/lib/utils";

interface DebateRecordShellProps {
  debateId: string;
  topic: string;
  status: string;
  description?: string | null;
  scheduledAt?: string | null;
  coverImageUrl?: string | null;
  publisherName?: string | null;
  participantCount?: number;
  rolePill?: string;
  /** Banner shown above subtopics (e.g. edit window message). */
  banner?: ReactNode;
  /** Right-aligned strip (e.g. "View Your Performance"). */
  topRightStrip?: ReactNode;
  /** Footer shown below subtopics (e.g. completion or "Coming soon" message). */
  footer?: ReactNode;
  /** Children rendered below subtopics (typically the comments section). */
  children?: ReactNode;
  /** Override threaded content per subtopic (used by completed view to render real cards). */
  renderSubtopicContent?: (subtopicId: string, subtopicTitle: string) => ReactNode | null;
  /** Subtopic count badges. Pass real counts from parent when overriding content. */
  subtopicCounts?: Record<string, number>;
  /** Fallback subtopics when threads hook returns nothing. */
  fallbackSubtopics?: { id: string; title: string }[];
  /** Side labels rendered as inline chips below the title. */
  fallbackSideLabels?: string[];
  /** Extra header chips (e.g. "Speaker", "Publisher"). */
  headerChips?: ReactNode;
}

const StatusPill = ({ status }: { status: string }) => {
  const isLive = status === "live";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-body font-semibold uppercase tracking-wider border",
        isLive
          ? "bg-red-500/10 text-red-500 border-red-500/30"
          : status === "completed"
          ? "bg-foreground/5 text-foreground border-foreground/15"
          : "bg-background text-foreground border-border",
      )}
    >
      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
      {status === "live" ? "Live" : status === "completed" ? "Completed" : status === "scheduled" ? "Scheduled" : status}
    </span>
  );
};

const StatementRow = ({ s }: { s: PreviewStatement }) => {
  const isResponse = s.kind !== "main";
  const glyph = isResponse ? "↳" : "•";
  const label =
    s.kind === "main" ? "Main"
    : s.kind === "counter" ? "Counter"
    : s.kind === "rebuttal" ? "Rebuttal"
    : s.kind === "affirms" ? "Affirms"
    : "Concedes";
  return (
    <div className={cn("relative py-2", isResponse ? "pl-6" : "pl-3")}>
      <div className="flex items-baseline gap-2">
        <span className="text-foreground/40 select-none text-sm leading-none">{glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            {label} <span className="text-foreground/40">— {s.speakerLabel}</span>
          </div>
          <p className="text-sm font-body text-foreground leading-relaxed" data-annotatable>{s.text}</p>
        </div>
      </div>
    </div>
  );
};

const DebateRecordShell = ({
  debateId,
  topic,
  status,
  description,
  scheduledAt,
  coverImageUrl,
  publisherName,
  participantCount,
  rolePill,
  banner,
  topRightStrip,
  footer,
  children,
  renderSubtopicContent,
  subtopicCounts = {},
  fallbackSubtopics = [],
  fallbackSideLabels = [],
  headerChips,
}: DebateRecordShellProps) => {
  const { subtopics: liveSubs, sideLabels, loading } = useDebatePreviewThreads({ debateId, status });
  const subs = liveSubs.length > 0 ? liveSubs : fallbackSubtopics.map((s) => ({ ...s, threads: [] }));
  const labels = sideLabels.length > 0 ? sideLabels : fallbackSideLabels;
  const ghostA = labels[0] ? `Speaker 1 · ${labels[0]}` : "Speaker 1";
  const ghostB = labels[1] ? `Speaker 2 · ${labels[1]}` : "Speaker 2";

  const scheduledLabel = useMemo(
    () =>
      scheduledAt
        ? new Date(scheduledAt).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : null,
    [scheduledAt],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        {coverImageUrl && (
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg shrink-0 bg-cover bg-center border border-border"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl sm:text-2xl leading-tight text-foreground">{topic}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <StatusPill status={status} />
            {typeof participantCount === "number" && (
              <span className="text-[11px] text-muted-foreground font-body inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {participantCount} participant{participantCount === 1 ? "" : "s"}
              </span>
            )}
            {rolePill && (
              <span className="text-[10px] font-body font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground/5 text-foreground border border-foreground/10">
                {rolePill}
              </span>
            )}
            {headerChips}
            {scheduledLabel && (
              <span className="text-[11px] text-muted-foreground font-body inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {scheduledLabel}
              </span>
            )}
            {publisherName && (
              <span className="text-[11px] text-muted-foreground font-body">by {publisherName}</span>
            )}
          </div>
          {labels.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {labels.map((lbl, i) => (
                <span
                  key={`${lbl}-${i}`}
                  className="text-[10px] uppercase tracking-wider font-body font-medium px-2 py-0.5 rounded-full bg-background border border-border text-foreground/80"
                >
                  Side {i + 1} · {lbl}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

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

      {banner}
      {topRightStrip}

      {/* Subtopic rows */}
      {subs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic px-2 py-6">
          {loading ? "Loading subtopics…" : "No subtopics defined."}
        </p>
      ) : (
        <div className="space-y-2">
          {subs.map((sub, idx) => {
            const liveThreads = sub.threads;
            const customCount = subtopicCounts[sub.id];
            const count = customCount ?? liveThreads.length;
            const customContent = renderSubtopicContent?.(sub.id, sub.title);
            return (
              <Collapsible key={sub.id} defaultOpen={idx === 0 && (count > 0 || !!customContent)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-accent/40 transition-colors">
                  <ChevronDown className="w-4 h-4 text-foreground/60 shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                  <h3 className="font-display text-base text-foreground flex-1 leading-snug">
                    {idx + 1}. {sub.title}
                  </h3>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {count > 0
                      ? `${count}`
                      : status === "scheduled"
                      ? "Coming soon"
                      : "—"}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-6 pr-2 py-2 space-y-2">
                    {customContent
                      ? customContent
                      : liveThreads.length > 0
                      ? liveThreads.map((t) => (
                          <div key={t.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
                            <p className="text-xs font-display text-foreground/80 mb-1 line-clamp-1">{t.title}</p>
                            <div className="space-y-0.5">
                              {t.statements.map((s) => (
                                <StatementRow key={s.id} s={s} />
                              ))}
                            </div>
                          </div>
                        ))
                      : (
                        <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-body mb-2">
                            Preview · how this subtopic will look
                          </p>
                          <GhostStatementCard kind="main" speakerLabel={ghostA} />
                          <GhostStatementCard kind="counter" speakerLabel={ghostB} />
                          <GhostStatementCard kind="affirms" speakerLabel={ghostA} />
                        </div>
                      )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {footer}
      {children}
    </div>
  );
};

export default DebateRecordShell;