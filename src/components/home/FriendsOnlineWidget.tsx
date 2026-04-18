import { Link } from "react-router-dom";
import { Users, ArrowRight, UserPlus } from "lucide-react";
import { useFriendsOnline } from "@/hooks/useConnections";
import EmptyStateHint from "@/components/home/EmptyStateHint";
import { useEmptyStateHint } from "@/hooks/useEmptyStateHint";

const FriendsOnlineWidget = () => {
  const { online, totalFollowing, loading } = useFriendsOnline();
  const { ref, active } = useEmptyStateHint<HTMLAnchorElement>();

  if (loading) return null;

  if (totalFollowing === 0) {
    return (
      <Link
        ref={ref}
        to="/profile/connections"
        className="flex items-center gap-3 bg-background border border-dashed border-border hover:border-foreground/20 rounded-lg p-4 mb-6 transition-colors group"
      >
        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-medium">Find people to debate with</p>
          <p className="text-[11px] text-muted-foreground font-body">
            <EmptyStateHint
              active={active}
              baseText="Follow speakers near you or who share your interests"
              hintMessages={["Your friends and followers go here."]}
            />
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }

  return (
    <Link
      to="/profile/connections"
      className="flex items-center gap-3 bg-background border border-border hover:border-foreground/20 rounded-lg p-4 mb-6 transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0 relative">
        <Users className="w-4 h-4 text-foreground" />
        {online.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium">
          {online.length > 0 ? (
            <>
              <span className="text-[#22c55e] font-semibold">{online.length}</span>{" "}
              {online.length === 1 ? "person" : "people"} online
            </>
          ) : (
            <>No friends online right now</>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground font-body truncate">
          {online.length > 0
            ? online
                .slice(0, 3)
                .map((u) => u.display_name || "Someone")
                .join(", ")
            : `Following ${totalFollowing}`}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
};

export default FriendsOnlineWidget;
