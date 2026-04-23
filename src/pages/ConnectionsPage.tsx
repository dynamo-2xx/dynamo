import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, UserPlus, Sparkles, MapPin, Hash, ArrowLeft, Eye, EyeOff, Inbox, Lock, Clock, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useFollowing,
  useRecommendedUsers,
  useFollowMutations,
  useMyPendingRequests,
  useIncomingFollowRequests,
} from "@/hooks/useConnections";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "following" | "recommended" | "requests";
type Visibility = "public" | "followers" | "private";

const ConnectionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("following");
  const { users: following, refresh: refreshFollowing } = useFollowing();
  const { users: recommended } = useRecommendedUsers(15);
  const { follow, unfollow, cancelRequest } = useFollowMutations();
  const { pendingIds, refresh: refreshPending } = useMyPendingRequests();
  const { requests: incoming, respond } = useIncomingFollowRequests();

  const [visibility, setVisibility] = useState<Visibility>("followers");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_presence")
        .select("visibility")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data?.visibility) setVisibility(data.visibility as Visibility);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateVisibility = async (v: Visibility) => {
    if (!user) return;
    setVisibility(v);
    const { error } = await (supabase as any)
      .from("user_presence")
      .upsert({ user_id: user.id, visibility: v, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) toast.error("Couldn't save");
    else toast.success("Visibility updated");
  };

  const handleFollow = async (id: string) => {
    const result = await follow(id);
    if (result === "following") {
      toast.success("Following");
      refreshFollowing();
    } else if (result === "requested") {
      toast.success("Follow request sent");
      refreshPending();
    }
  };

  const handleUnfollow = async (id: string) => {
    const ok = await unfollow(id);
    if (ok) {
      toast("Unfollowed");
      refreshFollowing();
    }
  };

  const handleCancelRequest = async (id: string) => {
    const ok = await cancelRequest(id);
    if (ok) {
      toast("Request canceled");
      refreshPending();
    }
  };

  const followingIds = useMemo(() => new Set(following.map((u) => u.user_id)), [following]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Profile
        </button>

        <h1 className="text-2xl font-display mb-2">Connections</h1>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Follow people to see when they're online and invite them to debate.
        </p>

        {/* Visibility toggle */}
        <div className="bg-background border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            {visibility === "private" ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm font-body font-medium">Online status visible to</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["public", "followers", "private"] as Visibility[]).map((v) => (
              <button
                key={v}
                onClick={() => updateVisibility(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-body capitalize border transition-colors ${
                  visibility === v
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/20"
                }`}
              >
                {v === "followers" ? "My followers" : v === "public" ? "Everyone" : "No one"}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border">
          {([
            ["following", `Following (${following.length})`],
            ["recommended", "Recommended"],
            ["requests", `Requests${incoming.length > 0 ? ` (${incoming.length})` : ""}`],
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-2 text-sm font-body border-b-2 -mb-px transition-colors ${
                tab === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "following" && (
          <div className="space-y-2">
            {following.length === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                text="You're not following anyone yet."
                cta={
                  <button
                    onClick={() => setTab("recommended")}
                    className="text-sm font-body text-foreground underline underline-offset-2"
                  >
                    See recommendations →
                  </button>
                }
              />
            ) : (
              following.map((u) => (
                <UserRow
                  key={u.user_id}
                  user={u}
                  action={
                    <button
                      onClick={() => handleUnfollow(u.user_id)}
                      className="px-3 py-1.5 rounded-md text-xs font-body border border-border hover:border-foreground/30 transition-colors"
                    >
                      Following
                    </button>
                  }
                />
              ))
            )}
          </div>
        )}

        {tab === "recommended" && (
          <div className="space-y-2">
            {recommended.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="w-5 h-5" />}
                text="Tag your debates and add a location to get personalized suggestions."
              />
            ) : (
              recommended.map((u) => {
                const reasons: string[] = [];
                if (u.shared_tags && u.shared_tags.length > 0)
                  reasons.push(`Also into ${u.shared_tags.slice(0, 2).join(", ")}`);
                if (u.same_location) reasons.push("Same area");
                if (u.mutual_count > 0) reasons.push(`${u.mutual_count} mutual`);
                const isRequested = pendingIds.has(u.user_id) || u.follow_status === "pending";
                const isFollowing = followingIds.has(u.user_id) || u.follow_status === "following";
                return (
                  <UserRow
                    key={u.user_id}
                    user={u}
                    reason={reasons.join(" · ")}
                    privateBadge={u.is_public === false}
                    action={
                      isFollowing ? (
                        <span className="px-3 py-1.5 text-xs font-body text-muted-foreground">Following</span>
                      ) : isRequested ? (
                        <button
                          onClick={() => handleCancelRequest(u.user_id)}
                          className="px-3 py-1.5 rounded-md text-xs font-body border border-border text-muted-foreground hover:border-foreground/30 transition-colors inline-flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" /> Requested
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollow(u.user_id)}
                          className="px-3 py-1.5 rounded-md text-xs font-body bg-foreground text-background hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          {u.is_public === false ? "Request" : "Follow"}
                        </button>
                      )
                    }
                  />
                );
              })
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-2">
            {incoming.length === 0 ? (
              <EmptyState icon={<Inbox className="w-5 h-5" />} text="No pending follow requests." />
            ) : (
              incoming.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 px-4 py-3 border border-border rounded-xl bg-background"
                >
                  <Link to={`/u/${req.requester_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-accent overflow-hidden shrink-0">
                      {req.requester?.avatar_url ? (
                        <img src={req.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-body">
                          {(req.requester?.display_name || "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-medium truncate">
                        {req.requester?.display_name || "Someone"}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-body truncate">
                        wants to follow you · {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        const ok = await respond(req.id, true);
                        if (ok) toast.success("Accepted");
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-body bg-foreground text-background hover:opacity-90 inline-flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await respond(req.id, false);
                        if (ok) toast("Declined");
                      }}
                      className="px-2.5 py-1.5 rounded-md text-xs font-body border border-border text-muted-foreground hover:border-foreground/30 inline-flex items-center"
                      aria-label="Decline"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const UserRow = ({
  user,
  action,
  reason,
  privateBadge,
}: {
  user: { user_id: string; display_name: string | null; avatar_url: string | null; affiliation: string | null; location?: string | null };
  action?: React.ReactNode;
  reason?: string;
  privateBadge?: boolean;
}) => (
  <Link
    to={`/u/${user.user_id}`}
    className="flex items-center gap-3 px-4 py-3 border border-border rounded-xl bg-background hover:border-foreground/20 transition-colors"
  >
    <div className="w-10 h-10 rounded-full bg-accent overflow-hidden shrink-0">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-body">
          {(user.display_name || "?").slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="font-body text-sm font-medium truncate">{user.display_name || "Unknown"}</p>
        {privateBadge && (
          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
      </div>
      <p className="text-[11px] text-muted-foreground font-body truncate">
        {reason || user.affiliation || (user.location && (<><MapPin className="w-3 h-3 inline mr-0.5" />{user.location}</>)) || "—"}
      </p>
    </div>
    <div onClick={(e) => e.preventDefault()}>{action}</div>
  </Link>
);

const EmptyState = ({ icon, text, cta }: { icon: React.ReactNode; text: string; cta?: React.ReactNode }) => (
  <div className="border border-dashed border-border rounded-xl px-5 py-10 text-center text-sm text-muted-foreground font-body">
    <div className="flex justify-center mb-2 text-muted-foreground">{icon}</div>
    {text}
    {cta && <div className="mt-3">{cta}</div>}
  </div>
);

export default ConnectionsPage;
