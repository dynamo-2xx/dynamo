import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, HandHeart, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import InterestedComposer from "@/components/debate/InterestedComposer";
import InterestedInboxPanel from "@/components/debate/InterestedInboxPanel";
import TagPicker from "@/components/tags/TagPicker";
import DebateRecordPreview from "@/components/debate/DebateRecordPreview";

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
  const [composerOpen, setComposerOpen] = useState(false);
  const [publisherName, setPublisherName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "tags" | "interested">("overview");
  const [participantCount, setParticipantCount] = useState<number>(0);

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

      const { count } = await supabase
        .from("debate_participants")
        .select("id", { count: "exact", head: true })
        .eq("debate_id", id);
      if (!cancelled) setParticipantCount(count || 0);
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
          <DebateRecordPreview
            debateId={debate.id}
            topic={debate.topic}
            description={debate.description}
            status={debate.status}
            scheduledAt={debate.scheduled_at}
            coverImageUrl={debate.cover_image_url}
            publisherName={publisherName}
            participantCount={participantCount}
            fallbackSubtopics={subtopics.map((s) => ({ id: s.id, title: s.title }))}
            fallbackSideLabels={sides.map((s) => s.label)}
          />
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
