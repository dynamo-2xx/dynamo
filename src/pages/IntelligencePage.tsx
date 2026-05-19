import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Smile, Meh, Frown, MessageSquare, Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePerformanceAnnotations, type PerfAnnotation } from "@/hooks/usePerformanceAnnotations";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

/**
 * §21 Performance Intelligence — standalone page.
 * Premium-only. Free users see blurred preview + upgrade CTA.
 * Route: /intelligence/:kind/:id  (kind = debate | cmm | live)
 */
const GROUPS: Array<{ key: PerfAnnotation["attribute_group"]; label: string }> = [
  { key: "argumentative_integrity", label: "Argumentative Integrity" },
  { key: "rhetorical_effectiveness", label: "Rhetorical Effectiveness" },
  { key: "engagement_quality", label: "Engagement Quality" },
  { key: "cognitive_depth", label: "Cognitive Depth" },
];

const SEV_ICON = {
  green: <Smile className="h-4 w-4 text-emerald-600" />,
  orange: <Meh className="h-4 w-4 text-amber-600" />,
  red: <Frown className="h-4 w-4 text-red-600" />,
} as const;

function backHref(kind: string, id: string) {
  if (kind === "debate") return `/debate/${id}`;
  if (kind === "cmm") return `/cmm/${id}`;
  return `/live/${id}`;
}

export default function IntelligencePage() {
  const { kind = "debate", id = "" } = useParams<{ kind: string; id: string }>();
  const sessionKind = (kind === "cmm" ? "cmm" : kind === "live" ? "live" : "debate") as PerfAnnotation["session_kind"];
  const { tier } = useSubscription();
  const isPremium = tier !== "free";
  const { data, loading } = usePerformanceAnnotations(isPremium ? id : null, sessionKind);
  const [sev, setSev] = useState<Set<PerfAnnotation["severity"]>>(new Set());

  const filtered = useMemo(
    () => (sev.size ? data.filter((a) => sev.has(a.severity)) : data),
    [data, sev],
  );
  const grouped = useMemo(() => {
    const m = new Map<string, PerfAnnotation[]>();
    for (const a of filtered) {
      const arr = m.get(a.attribute_group) ?? [];
      arr.push(a);
      m.set(a.attribute_group, arr);
    }
    return m;
  }, [filtered]);

  function toggle(s: PerfAnnotation["severity"]) {
    const n = new Set(sev);
    n.has(s) ? n.delete(s) : n.add(s);
    setSev(n);
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link to={backHref(kind, id)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to record
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5" />
          <h1 className="text-2xl font-serif">Performance Intelligence</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Dynamo's analysis of argument integrity, rhetoric, engagement, and depth.
        </p>

        {!isPremium ? (
          <Card className="p-6 text-center">
            <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <h2 className="font-serif text-lg mb-1">Premium feature</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to see what Dynamo flagged in this record.
            </p>
            <Link to="/pricing"><Button>Upgrade to Premium</Button></Link>
            <div className="mt-6 space-y-2 blur-sm select-none pointer-events-none" aria-hidden>
              {GROUPS.map((g) => (
                <Card key={g.key} className="p-3 text-left text-sm">{g.label} · 3 insights</Card>
              ))}
            </div>
          </Card>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {(["green", "orange", "red"] as const).map((s) => {
                const count = data.filter((a) => a.severity === s).length;
                const active = sev.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    disabled={count === 0}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${active ? "bg-accent" : "bg-background"} ${count === 0 ? "opacity-40" : ""}`}
                  >
                    {SEV_ICON[s]} {count}
                  </button>
                );
              })}
            </div>

            {loading && <p className="text-sm text-muted-foreground">Loading insights…</p>}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No insights yet for this record.</p>
            )}

            <div className="space-y-6">
              {GROUPS.map((g) => {
                const items = grouped.get(g.key) ?? [];
                if (items.length === 0) return null;
                return (
                  <section key={g.key}>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {g.label}
                    </h2>
                    <div className="space-y-2">
                      {items.map((a) => (
                        <Card key={a.id} className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">{SEV_ICON[a.severity]}</div>
                            <div className="flex-1 min-w-0">
                              {a.sub_attribute && (
                                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                                  {a.sub_attribute}
                                </div>
                              )}
                              <p className="text-sm">{a.explanation}</p>
                              {a.recommendation && (
                                <p className="text-sm mt-1.5 text-muted-foreground">
                                  <span className="font-medium text-foreground">Try: </span>
                                  {a.recommendation}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const snippet = `> ${a.explanation}${a.recommendation ? `\n> \n> Recommendation: ${a.recommendation}` : ""}`;
                                  try {
                                    await navigator.clipboard.writeText(snippet);
                                    toast({
                                      title: "Quoted insight copied",
                                      description: "Open Dynamo on this record and paste to discuss.",
                                    });
                                  } catch {
                                    toast({ title: "Couldn't copy", variant: "destructive" });
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
                              >
                                <MessageSquare className="h-3 w-3" /> Discuss in Dynamo
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}