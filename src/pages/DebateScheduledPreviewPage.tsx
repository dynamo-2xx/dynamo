import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, HandHeart, Loader2, Bell, MessageSquare, Check, LogIn, Eye } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import InterestedComposer from "@/components/debate/InterestedComposer";
import InterestedInboxPanel from "@/components/debate/InterestedInboxPanel";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";
import TagPicker from "@/components/tags/TagPicker";
import DebateRecordPreview from "@/components/debate/DebateRecordPreview";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ensurePushSubscribed, pushSupported } from "@/lib/push";
import { toast } from "@/hooks/use-toast";

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
  const [notifySubscribed, setNotifySubscribed] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueSideOpen, setQueueSideOpen] = useState(false);
  const [queuedSideId, setQueuedSideId] = useState<string | null>(null);
  const [invitedAsSpeaker, setInvitedAsSpeaker] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [spectatorQueued, setSpectatorQueued] = useState(false);
  const [spectatorBusy, setSpectatorBusy] = useState(false);

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

      if (user) {
        const { data: sub } = await supabase
          .from("debate_notify_subscriptions")
          .select("id")
          .eq("debate_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setNotifySubscribed(!!sub);

        const { data: interest } = await supabase
          .from("debate_interests")
          .select("side_id, role")
          .eq("debate_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled && interest?.role === "queued_speaker") {
          setQueuedSideId(interest.side_id ?? sides[0]?.id ?? null);
        }
        if (!cancelled && (interest as any)?.role === "spectator") {
          setSpectatorQueued(true);
        }

        const { data: inv } = await (supabase as any)
          .from("debate_invitations")
          .select("id")
          .eq("debate_id", id)
          .eq("invited_user_id", user.id)
          .maybeSingle();
        if (!cancelled) setInvitedAsSpeaker(!!inv);

        const { data: part } = await supabase
          .from("debate_participants")
          .select("id")
          .eq("debate_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setIsParticipant(!!part);
      }
    })();

    // Realtime: react to status changes (pending → live → completed) so the
    // preview gains its LIVE pill (and eventually the record view) without a
    // manual refresh.
    const channel = supabase
      .channel(`debate-status-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "debates", filter: `id=eq.${id}` },
        (payload) => {
          if (cancelled) return;
          setDebate((d: any) => ({ ...(d ?? {}), ...(payload.new as any) }));
        },
      )
      .subscribe();

    const onVis = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      (async () => {
        const { data } = await (supabase as any)
          .from("debates")
          .select("status,ended_at,edit_window_ends_at")
          .eq("id", id)
          .maybeSingle();
        if (cancelled || !data) return;
        setDebate((d: any) => ({ ...(d ?? {}), ...data }));
      })();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id, user]);

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
  const isLive = debate.status === "live";
  const isCompleted = debate.status === "completed";
  const canJoinAsSpectator =
    isLive && !!user && !isOwner && !invitedAsSpeaker && !isParticipant;

  const handleJoinAsSpectator = async () => {
    if (!user || !id) return;
    setSpectatorBusy(true);
    try {
      // Upsert via delete-then-insert; default role for debate_interests is 'spectator'.
      await supabase
        .from("debate_interests")
        .delete()
        .eq("debate_id", id)
        .eq("user_id", user.id);
      const { error } = await supabase.from("debate_interests").insert({
        debate_id: id,
        user_id: user.id,
        role: "spectator",
        status: "pending",
      } as any);
      if (error) throw error;
      setSpectatorQueued(true);
      navigate(`/debate/${id}`);
    } catch (e: any) {
      toast({ title: "Couldn't join", description: e?.message ?? "Try again." });
    } finally {
      setSpectatorBusy(false);
    }
  };

  const handleToggleNotify = async () => {
    if (!user || !id) return;
    setNotifyBusy(true);
    try {
      if (notifySubscribed) {
        await supabase
          .from("debate_notify_subscriptions")
          .delete()
          .eq("debate_id", id)
          .eq("user_id", user.id);
        setNotifySubscribed(false);
        toast({ description: "You won't be notified when this debate starts." });
      } else {
        const { error } = await supabase
          .from("debate_notify_subscriptions")
          .insert({ debate_id: id, user_id: user.id });
        if (error) throw error;

        // Try to set up browser push (background notifications). Falls back gracefully.
        if (pushSupported()) {
          const res = await ensurePushSubscribed();
          if (!res.ok && res.reason === "denied") {
            toast({
              title: "Notifications blocked",
              description: "Enable browser notifications in your site settings to get a push when this starts.",
            });
          } else if (!res.ok && res.reason === "preview") {
            toast({
              description: "You'll be notified in-app. Browser push works on the published site.",
            });
          }
        }
        setNotifySubscribed(true);
        toast({ description: "We'll notify you when this debate starts." });
      }
    } catch (e: any) {
      toast({ title: "Couldn't update notification", description: e?.message ?? "Try again." });
    } finally {
      setNotifyBusy(false);
    }
  };

  const handleQueueToJoin = async (sideId: string) => {
    if (!user || !id) return;
    setQueueBusy(true);
    try {
      // Upsert via delete-then-insert to avoid unique constraints on (debate_id,user_id).
      await supabase
        .from("debate_interests")
        .delete()
        .eq("debate_id", id)
        .eq("user_id", user.id);
      const { error } = await supabase.from("debate_interests").insert({
        debate_id: id,
        user_id: user.id,
        role: "queued_speaker",
        side_id: sideId,
        status: "pending",
      });
      if (error) throw error;
      setQueuedSideId(sideId);
      setQueueSideOpen(false);
      toast({ description: "Queued — taking you to the lobby." });
      navigate(`/debate/${id}/lobby`);
    } catch (e: any) {
      toast({ title: "Couldn't queue", description: e?.message ?? "Try again." });
    } finally {
      setQueueBusy(false);
    }
  };

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
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-body font-medium hover:opacity-90 transition-opacity shadow-lg"
                >
                  <HandHeart className="w-4 h-4" />
                  Interested?
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-1.5" align="center" side="top">
                {queueSideOpen ? (
                  <div className="p-2">
                    <p className="text-xs font-body text-muted-foreground mb-2">
                      Pick a side to queue on:
                    </p>
                    <div className="space-y-1">
                      {sides.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={queueBusy}
                          onClick={() => handleQueueToJoin(s.id)}
                          className="w-full text-left px-3 py-2 text-sm font-body rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQueueSideOpen(false)}
                      className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                {canJoinAsSpectator && (
                  <button
                    type="button"
                    disabled={spectatorBusy}
                    onClick={handleJoinAsSpectator}
                    className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-body font-medium flex items-center gap-1.5">
                        {spectatorQueued ? "Watch live" : "Join as spectator"}
                        {spectatorQueued && <Check className="w-3.5 h-3.5 text-foreground" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        It's live — watch without taking the mic.
                      </div>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (queuedSideId) {
                      navigate(`/debate/${id}/lobby`);
                    } else {
                      setQueueSideOpen(true);
                    }
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left"
                >
                  <LogIn className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-body font-medium flex items-center gap-1.5">
                      {queuedSideId ? "Go to lobby" : "Queue to join as speaker"}
                      {queuedSideId && <Check className="w-3.5 h-3.5 text-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {queuedSideId
                        ? "You're queued — wait for the host to start."
                        : "Wait in the lobby; host can accept you."}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left"
                >
                  <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-body font-medium">Message the publisher</div>
                    <div className="text-xs text-muted-foreground">Start a DM about joining or scheduling.</div>
                  </div>
                </button>
                {!isLive && !isCompleted && (
                <button
                  type="button"
                  disabled={notifyBusy}
                  onClick={handleToggleNotify}
                  className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-50"
                >
                  <Bell className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-body font-medium flex items-center gap-1.5">
                      Notify me when it starts
                      {notifySubscribed && <Check className="w-3.5 h-3.5 text-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {notifySubscribed ? "On — tap to turn off." : "Browser push when this debate goes live."}
                    </div>
                  </div>
                </button>
                )}
                  </>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="mt-6">
          <RecordCommentsSection
            recordType={(debate as any).format === "change_my_mind" ? "change_my_mind" : "debate"}
            recordId={debate.id}
          />
        </div>
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
