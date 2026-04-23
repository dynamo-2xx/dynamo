import { Link } from "react-router-dom";
import { ArrowUpRight, Lock, UserPlus, Clock, MapPin } from "lucide-react";
import { useMemo } from "react";
import {
  useFollowing,
  useRecommendedUsers,
  useFollowMutations,
  useMyPendingRequests,
  useFriendsOnline,
} from "@/hooks/useConnections";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FindPeopleRow = () => {
  const { user } = useAuth();
  const { users, loading } = useRecommendedUsers(15);
  const { users: following, refresh: refreshFollowing } = useFollowing();
  const { pendingIds, refresh: refreshPending } = useMyPendingRequests();
  const { follow, cancelRequest } = useFollowMutations();
  const { online, totalFollowing } = useFriendsOnline();

  const followingIds = useMemo(() => new Set(following.map((u) => u.user_id)), [following]);

  if (!user) return null;
  if (loading) return null;
  if (users.length === 0) return null;

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

  const handleCancel = async (id: string) => {
    const ok = await cancelRequest(id);
    if (ok) {
      toast("Request canceled");
      refreshPending();
    }
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h3 className="font-display text-lg truncate">Find people</h3>
          {totalFollowing > 0 && (
            <p className="text-[11px] text-muted-foreground font-body truncate">
              {online.length > 0 ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] align-middle mr-1.5" />
                  <span className="text-foreground font-medium">{online.length}</span>{" "}
                  {online.length === 1 ? "friend" : "friends"} online
                </>
              ) : (
                <>No friends online · Following {totalFollowing}</>
              )}
            </p>
          )}
        </div>
        <Link
          to="/profile/connections"
          aria-label="Open connections"
          className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {users.map((u) => {
          const isRequested = pendingIds.has(u.user_id) || u.follow_status === "pending";
          const isFollowing = followingIds.has(u.user_id) || u.follow_status === "following";
          const subtitle =
            (u.shared_tags && u.shared_tags.length > 0 && `Also into ${u.shared_tags.slice(0, 2).join(", ")}`) ||
            (u.same_location && "Same area") ||
            (u.mutual_count > 0 && `${u.mutual_count} mutual`) ||
            u.affiliation ||
            u.location ||
            null;
          return (
            <div
              key={u.user_id}
              className="snap-start shrink-0 w-[160px] border border-border rounded-xl bg-background p-4 flex flex-col items-center text-center"
            >
              <Link to={`/u/${u.user_id}`} className="contents">
                <div className="w-14 h-14 rounded-full bg-accent overflow-hidden mb-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-body">
                      {(u.display_name || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 min-w-0 max-w-full">
                  <p className="font-body text-sm font-medium truncate">{u.display_name || "Unknown"}</p>
                  {u.is_public === false && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground font-body truncate w-full mt-0.5 mb-3 inline-flex items-center justify-center gap-1">
                  {u.same_location && <MapPin className="w-3 h-3" />}
                  <span className="truncate">{subtitle || "—"}</span>
                </p>
              </Link>
              {isFollowing ? (
                <span className="text-[11px] font-body text-muted-foreground">Following</span>
              ) : isRequested ? (
                <button
                  onClick={() => handleCancel(u.user_id)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-body border border-border text-muted-foreground hover:border-foreground/30 transition-colors inline-flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" /> Requested
                </button>
              ) : (
                <button
                  onClick={() => handleFollow(u.user_id)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-body bg-foreground text-background hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  {u.is_public === false ? "Request" : "Follow"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FindPeopleRow;