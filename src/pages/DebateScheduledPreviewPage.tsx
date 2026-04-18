import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Clock, Users, HandHeart, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { gradientFromSeed } from "@/lib/gradient";
import { cn } from "@/lib/utils";
import InterestedComposer from "@/components/debate/InterestedComposer";
import InterestedInboxPanel from "@/components/debate/InterestedInboxPanel";
import TagPicker from "@/components/tags/TagPicker";

interface Subtopic {
  id: string;
  title: string;
  sort_order: number;
}
interface Side {
  id: string;
  label: string;
  sort_order: number;
}

const DebateScheduledPreviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debate, setDebate] = useState<any>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [loading, setLoading] = useState(true);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [publisherName, setPublisherName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "tags" | "interested">("overview");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: d }, { data: subs }, { data: sds }] = await Promise.all([
        supabase.from("debates").select("*").eq("id", id).maybeSingle(),
        supabase.from("debate_subtopics").select("*").eq("debate_id", id).order("sort_order"),
        supabase.from("debate_sides").select("*").eq("debate_id", id).order("sort_order"),
      ]);
      if (cancelled) return;

      if (d && (d.status === "live" || d.status === "completed")) {
        navigate(`/debate/${id}`, { replace: true });
        return;
      }

      setDebate(d);
      setSubtopics((subs as Subtopic[]) || []);
      setSides((sds as Side[]) || []);
      setLoading(false);

      if (d?.created_by) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", d.created_by)
          .maybeSingle();
        if (!cancelled) setPublisherName(prof?.display_name || "Publisher");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!debate) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center font-body">
          <p className="text-muted-foreground">Debate not found or unavailable.</p>
          <Link to="/explore" className="text-sm underline mt-4 inline-block">Back to Explore</Link>
        </div>
      </AppLayout>
    );
  }

  const isOwner = !!user && user.id === debate.created_by;
  const showInterestedCta = !!user && !isOwner;

  const bg = debate.cover_image_url
    ? { backgroundImage: `url(${debate.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: gradientFromSeed(debate.topic) };

  const scheduledLabel = debate.scheduled_at
    ? new Date(debate.scheduled_at).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* Cover */}
        <div
          className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border mb-6"
          style={bg}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider bg-background/95 text-foreground border border-border mb-2">
              {debate.status === "scheduled" ? "Scheduled" : "Upcoming"}
            </span>
            <h1 className="font-display text-white text-2xl sm:text-3xl leading-tight drop-shadow">
              {debate.topic}
            </h1>
            {scheduledLabel && (
              <p className="text-white/90 text-xs font-body mt-1 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" /> {scheduledLabel}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {debate.description && (
          <div className="border border-border rounded-lg mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => setDescriptionOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
                About this debate
              </span>
              <ChevronDown
                className={cn("w-4 h-4 text-muted-foreground transition-transform", descriptionOpen && "rotate-180")}
              />
            </button>
            {descriptionOpen && (
              <div className="px-4 pb-4 text-sm font-body text-foreground whitespace-pre-wrap">
                {debate.description}
              </div>
            )}
          </div>
        )}

        {/* Owner tabs */}
        {isOwner && (
          <div className="flex items-center gap-1 border-b border-border mb-5">
            {([
              { key: "overview", label: "Overview" },
              { key: "tags", label: "Tags" },
              { key: "interested", label: "Interested" },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-3 py-2 text-sm font-body font-medium border-b-2 -mb-px transition-colors",
                  activeTab === t.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content (or always overview for non-owners) */}
        {(!isOwner || activeTab === "overview") && (
          <div className="space-y-4">
            {sides.length > 0 && (
              <div className="bg-background border border-border rounded-lg p-5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium block mb-3">
                  Sides
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  {sides.map((s) => (
                    <div
                      key={s.id}
                      className="flex-1 bg-accent rounded-lg px-3 py-2 text-sm font-body font-medium text-center"
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-background border border-border rounded-lg p-5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium block mb-3">
                Subtopics
              </label>
              <ol className="space-y-2">
                {subtopics.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm font-body">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="flex-1 bg-accent rounded-lg px-3 py-2">{s.title}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-1">
                  <Users className="w-3 h-3 inline mr-1" /> Turns / subtopic
                </p>
                <p className="text-xl font-display">{debate.turns_per_subtopic}</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-1">
                  <Clock className="w-3 h-3 inline mr-1" /> Time / turn
                </p>
                <p className="text-xl font-display">{debate.time_per_turn}</p>
              </div>
            </div>
          </div>
        )}

        {isOwner && activeTab === "tags" && (
          <div className="bg-background border border-border rounded-lg p-5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium block mb-3">
              Tags
            </label>
            <p className="text-xs font-body text-muted-foreground mb-3">
              Tags help people on Explore find this debate.
            </p>
            <TagPicker kind="debate" recordId={debate.id} max={5} />
          </div>
        )}

        {isOwner && activeTab === "interested" && (
          <InterestedInboxPanel
            debateId={debate.id}
            debateTopic={debate.topic}
            sides={sides.map((s) => ({ id: s.id, label: s.label }))}
          />
        )}

        {/* Owner edit action */}
        {isOwner && (
          <div className="mt-8 sticky bottom-4 z-10">
            <button
              type="button"
              onClick={() => navigate(`/create?edit=${debate.id}`)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-background text-sm font-body font-medium hover:bg-accent transition-colors shadow-lg"
            >
              Edit debate
            </button>
          </div>
        )}

        {/* Interested CTA — opens DM composer */}
        {showInterestedCta && (
          <div className="mt-8 sticky bottom-4 z-10">
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-body font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              <HandHeart className="w-4 h-4" />
              Interested?
            </button>
          </div>
        )}
      </div>

      {showInterestedCta && (
        <InterestedComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          debateId={debate.id}
          debateTopic={debate.topic}
          publisherId={debate.created_by}
          publisherName={publisherName}
          sides={sides.map((s) => ({ id: s.id, label: s.label }))}
        />
      )}
    </AppLayout>
  );
};

export default DebateScheduledPreviewPage;
