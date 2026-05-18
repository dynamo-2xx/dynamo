import { useMemo, useState } from "react";
import { Sparkles, Smile, Meh, Frown, Lock, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import FloatingOverlay from "@/components/debate/FloatingOverlay";
import { usePerformanceAnnotations, type PerfAnnotation } from "@/hooks/usePerformanceAnnotations";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * §21 Floating Performance Intelligence bubble — sits alongside Argument Map
 * and Notebook in-room and on-record. Premium-only.
 */
interface Props {
  sessionId: string;
  sessionKind: "debate" | "cmm" | "live";
  participantId?: string;
  subtopicId?: string | null;
}

const SEV_ICON = {
  green: <Smile className="w-3.5 h-3.5 text-emerald-600" />,
  orange: <Meh className="w-3.5 h-3.5 text-amber-600" />,
  red: <Frown className="w-3.5 h-3.5 text-red-600" />,
} as const;

export default function FloatingIntelligence({
  sessionId, sessionKind, participantId, subtopicId,
}: Props) {
  const [open, setOpen] = useState(false);
  const { tier } = useSubscription();
  const isPremium = tier !== "free";
  const { data } = usePerformanceAnnotations(isPremium ? sessionId : null, sessionKind, participantId);

  const scoped = useMemo(
    () => (subtopicId ? data.filter((a) => !a.subtopic_id || a.subtopic_id === subtopicId) : data),
    [data, subtopicId],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-[8.5rem] z-20 inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-background/80 backdrop-blur-md border border-foreground/10 text-xs font-semibold hover:bg-background transition-colors shadow-lg"
      >
        {isPremium ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        Insights
        {isPremium && scoped.length > 0 && (
          <span className="ml-1 text-[10px] bg-foreground/10 rounded-full px-1.5 py-0.5">
            {scoped.length}
          </span>
        )}
      </button>
      <FloatingOverlay
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Premium"
        title="Performance Intelligence"
        initialWidth={360}
        initialHeight={460}
        storageKey="perf-intelligence"
        initialPosition={{ x: 24, y: 24 }}
      >
        <div className="p-3">
          {!isPremium ? (
            <div className="text-center py-6">
              <Lock className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground mb-3">
                Upgrade to see what Dynamo flagged.
              </p>
              <Link to="/pricing" className="inline-flex h-8 items-center rounded-full bg-foreground text-background text-xs px-3">
                Upgrade
              </Link>
            </div>
          ) : scoped.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No insights yet — Dynamo will analyze as the session progresses.
            </p>
          ) : (
            <ul className="space-y-2">
              {scoped.map((a) => (
                <li key={a.id} className="border border-foreground/10 rounded-md p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{SEV_ICON[a.severity]}</div>
                    <div className="flex-1 min-w-0">
                      {a.sub_attribute && (
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {a.sub_attribute}
                        </div>
                      )}
                      <p className="text-xs leading-snug">{a.explanation}</p>
                      {a.recommendation && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          <span className="font-medium text-foreground">Try: </span>{a.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {isPremium && (
            <Link
              to={`/intelligence/${sessionKind}/${sessionId}`}
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="w-3 h-3" /> Open full report
            </Link>
          )}
        </div>
      </FloatingOverlay>
    </>
  );
}