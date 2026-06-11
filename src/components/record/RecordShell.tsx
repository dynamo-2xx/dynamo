import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Download, Users, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { gradientFromSeed } from "@/lib/gradient";
import { PerformanceInsightsToggle } from "@/components/insights/PerformanceInsightsToggle";
import ArgumentMapContent, {
  type ArgumentMapEntryInput,
  type SubtopicInput,
  type TranscriptEntryInput,
} from "@/components/debate/ArgumentMapContent";

export type RecordStatus = "completed" | "live" | "scheduled" | "processing" | "failed" | string;

interface RecordShellProps {
  kind: "debate" | "live" | "imported";
  topic: string;
  description?: string | null;
  status: RecordStatus;
  coverImageUrl?: string | null;
  publisherName?: string | null;
  participantCount?: number;
  scheduledAt?: string | null;
  createdAt?: string | null;
  importedSourceUrl?: string | null;
  importedSourceKind?: string | null;

  /** Side / participant pills row, rendered between hero and tabs. */
  pillsRow?: ReactNode;
  /** Right-aligned action buttons (Share, Continue, etc.) rendered just under the pills row. */
  actionsRow?: ReactNode;
  /** Extra content rendered below the back button (e.g. progress / failure banners). */
  belowBack?: ReactNode;
  /** Optional override: if provided, replaces the default tab body (Transcript / Threaded record). */
  bodyOverride?: ReactNode;

  // Data for the default tab body
  subtopics?: SubtopicInput[];
  transcriptEntries?: TranscriptEntryInput[];
  argumentMap?: ArgumentMapEntryInput[];
  sessionId?: string;
  sessionKind?: "debate" | "cmm" | "live" | "imported";
  sessionComplete?: boolean;

  /** Optional children rendered below the body (e.g. comments). */
  children?: ReactNode;
}

const StatusPill = ({ status }: { status: RecordStatus }) => {
  const isLive = status === "live";
  const isCompleted = status === "completed" || status === "ready";
  const label =
    isLive
      ? "Live now"
      : isCompleted
        ? "Completed"
        : status === "scheduled"
          ? "Scheduled"
          : status === "processing"
            ? "Processing"
            : status === "failed"
              ? "Failed"
              : String(status || "Upcoming");
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
      {label}
    </span>
  );
};

const RecordShell = ({
  kind,
  topic,
  description,
  status,
  coverImageUrl,
  publisherName,
  participantCount,
  scheduledAt,
  importedSourceUrl,
  importedSourceKind,
  pillsRow,
  actionsRow,
  belowBack,
  bodyOverride,
  subtopics = [],
  transcriptEntries = [],
  argumentMap = [],
  sessionId,
  sessionKind,
  sessionComplete,
  children,
}: RecordShellProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"transcript" | "threaded">("threaded");

  const heroStyle = useMemo(
    () =>
      coverImageUrl
        ? {
            backgroundImage: `url(${coverImageUrl})`,
            backgroundSize: "cover" as const,
            backgroundPosition: "center" as const,
          }
        : { backgroundImage: gradientFromSeed(topic || sessionId || kind) },
    [coverImageUrl, topic, sessionId, kind],
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
      transition={{ duration: 0.35 }}
      className="max-w-3xl mx-auto px-4 py-6 sm:py-10"
      data-record-root
    >
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-4 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>
      {belowBack}

      {/* Hero */}
      <div
        className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-border shadow-sm"
        style={heroStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-center gap-2 mb-3">
            <StatusPill status={status} />
            {kind === "imported" && (
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
            {typeof participantCount === "number" && participantCount > 0 && (
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
                source:{" "}
                {(() => {
                  try {
                    return new URL(importedSourceUrl).hostname.replace(/^www\./, "");
                  } catch {
                    return importedSourceUrl;
                  }
                })()}
              </a>
            )}
            {!importedSourceUrl && importedSourceKind && (
              <span className="inline-flex items-center gap-1">source: {importedSourceKind}</span>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      {description && (
        <details className="group border border-border rounded-xl overflow-hidden bg-card mt-6">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-accent/40 transition-colors">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
              About this record
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div
            className="px-4 pb-4 text-sm font-body text-foreground whitespace-pre-wrap"
            data-annotatable
          >
            {description}
          </div>
        </details>
      )}

      {/* Pills row (sides or participants) */}
      {pillsRow && <div className="mt-6">{pillsRow}</div>}

      {/* Actions row */}
      {actionsRow && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {actionsRow}
        </div>
      )}

      {/* Body */}
      <div className="mt-6">
        {bodyOverride ?? (
          <>
            <div className="flex gap-1 mb-3 border-b border-foreground/10">
              <div className="flex flex-1 gap-1">
                {(["transcript", "threaded"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-2 text-xs uppercase tracking-widest font-body border-b-2 -mb-px transition-colors ${
                      tab === t
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "transcript" ? "Transcript" : "Threaded record"}
                  </button>
                ))}
              </div>
              <div className="flex items-center pb-2">
                <PerformanceInsightsToggle />
              </div>
            </div>

            <ArgumentMapContent
              tab={tab}
              subtopics={subtopics}
              transcriptEntries={transcriptEntries}
              argumentMap={argumentMap}
              sessionId={sessionId}
              sessionKind={sessionKind}
              sessionComplete={sessionComplete}
            />
          </>
        )}
      </div>

      {children && <div className="mt-8 pt-6 border-t border-foreground/10">{children}</div>}
    </motion.div>
  );
};

export default RecordShell;