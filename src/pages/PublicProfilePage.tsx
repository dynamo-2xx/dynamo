import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, UserPlus, Hash, MessageSquare, Lock, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowMutations, useMyPendingRequests } from "@/hooks/useConnections";
import { toast } from "sonner";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import ReportButton from "@/components/ReportButton";

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  affiliation: string | null;
  is_public: boolean;
}

interface DebateRow {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [debates, setDebates] = useState<DebateRow[]>([]);
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const { follow, unfollow, cancelRequest } = useFollowMutations();
  const { pendingIds, refresh: refreshPending } = useMyPendingRequests();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: pdata } = await (supabase as any).rpc("get_profile_card", { _user_id: userId });
      const p = (pdata && pdata[0]) || null;
      if (cancelled) return;
      setProfile(p);

      if (p?.is_public) {
        const { data: ddata } = await supabase
          .from("debates")
          .select("id, topic, status, created_at")
          .eq("created_by", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!cancelled) setDebates((ddata || []) as DebateRow[]);
      } else if (!cancelled) {
        setDebates([]);
      }

      if (user) {
        const { data: edge } = await (supabase as any)
          .from("connections")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("followed_id", userId)
          .maybeSingle();
        if (!cancelled) setFollowing(!!edge);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, user]);

  useEffect(() => {
    if (userId) setRequested(pendingIds.has(userId));
  }, [pendingIds, userId]);

  const isMe = user?.id === userId;

  useDocumentMeta(
    profile
      ? {
          title: `${profile.display_name ?? "Profile"} — Dynamo`,
          description: profile.affiliation
            ? `${profile.display_name ?? "User"} on Dynamo · ${profile.affiliation}`
            : `${profile.display_name ?? "User"} on D. Bring people to the power.`,
          image: profile.avatar_url ?? undefined,
          type: "profile",
          canonical: typeof window !== "undefined" ? `${window.location.origin}/u/${userId}` : undefined,
        }
      : { title: "Profile — Dynamo" }
  );

  const handleFollow = async () => {
    if (!userId || !user) {
      navigate("/auth");
      return;
    }
    if (following) {
      const ok = await unfollow(userId);
      if (ok) {
        setFollowing(false);
        toast("Unfollowed");
      }
    } else if (requested) {
      const ok = await cancelRequest(userId);
      if (ok) {
        setRequested(false);
        refreshPending();
        toast("Follow request canceled");
      }
    } else {
      const result = await follow(userId);
      if (result === "following") {
        setFollowing(true);
        toast.success("Following");
      } else if (result === "requested") {
        setRequested(true);
        refreshPending();
        toast.success("Follow request sent");
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {loading ? (
          <div className="animate-pulse h-32 bg-accent rounded-xl" />
        ) : !profile ? (
          <div className="text-center py-20 text-muted-foreground font-body">This profile is private or doesn't exist.</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {profile.banner_url && (
              <div
                className="h-32 rounded-xl bg-cover bg-center mb-4"
                style={{ backgroundImage: `url(${profile.banner_url})` }}
              />
            )}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-accent overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-body">
                    {(profile.display_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-display truncate">{profile.display_name || "Unknown"}</h1>
                  {!profile.is_public && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-body uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>
                {profile.affiliation && (
                  <p className="text-sm text-muted-foreground font-body">{profile.affiliation}</p>
                )}
              </div>
              {!isMe && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-2 rounded-md text-sm font-body inline-flex items-center gap-1.5 transition-colors ${
                      following || requested
                        ? "border border-border text-foreground hover:border-foreground/30"
                        : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {requested ? <Clock className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {following ? "Following" : requested ? "Requested" : profile.is_public ? "Follow" : "Request to follow"}
                  </button>
                  {userId && <ReportButton target={{ targetType: "profile", targetId: userId }} />}
                </div>
              )}
            </div>

            {profile.is_public ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-display text-lg">Public debates</h3>
                </div>
                {debates.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl px-5 py-8 text-center text-sm text-muted-foreground font-body">
                    No public debates yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {debates.map((d) => (
                      <Link
                        key={d.id}
                        to={`/debate/${d.id}`}
                        className="block border border-border rounded-xl px-5 py-4 hover:border-foreground/20 transition-colors bg-background"
                      >
                        <p className="font-display text-sm">{d.topic}</p>
                        <p className="text-[11px] text-muted-foreground font-body mt-1">
                          {d.status} · {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="border border-dashed border-border rounded-xl px-5 py-10 text-center">
                <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-body text-muted-foreground">
                  This profile is private. Their activity is hidden.
                </p>
                {!isMe && !following && (
                  <p className="text-[11px] font-body text-muted-foreground mt-2">
                    {requested ? "Your request is pending approval." : "Send a follow request to connect."}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default PublicProfilePage;
