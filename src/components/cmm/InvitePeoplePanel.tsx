import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFollowing, useRecommendedUsers, type ConnectionUser } from "@/hooks/useConnections";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  debateId: string;
}

const initials = (name: string | null) =>
  (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/**
 * Lightweight invite panel for Change My Mind. Single-side debate, so invitations
 * are issued without a side_id (challengers define their own at queue time).
 */
const InvitePeoplePanel = ({ debateId }: Props) => {
  const { users: following, loading: lf } = useFollowing();
  const { users: recommended, loading: lr } = useRecommendedUsers(15);
  const [query, setQuery] = useState("");
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("debate_invitations")
        .select("invited_user_id")
        .eq("debate_id", debateId);
      setInvitedIds(new Set((data || []).map((r: any) => r.invited_user_id)));
    })();
  }, [debateId]);

  const merged: ConnectionUser[] = useMemo(() => {
    const map = new Map<string, ConnectionUser>();
    following.forEach((u) => map.set(u.user_id, u));
    recommended.forEach((u) => { if (!map.has(u.user_id)) map.set(u.user_id, u); });
    const list = Array.from(map.values());
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) =>
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.affiliation || "").toLowerCase().includes(q),
    );
  }, [following, recommended, query]);

  const invite = async (u: ConnectionUser) => {
    if (invitedIds.has(u.user_id)) return;
    setBusyId(u.user_id);
    const { data, error } = await supabase.rpc("create_debate_invitation", {
      _debate_id: debateId,
      _invited_user_id: u.user_id,
      _invited_username: u.display_name || "",
      _invited_email: "",
      _side_id: null as any,
    });
    setBusyId(null);
    if (error || !data) {
      toast.error("Couldn't send invite");
      return;
    }
    setInvitedIds((prev) => new Set(prev).add(u.user_id));
    toast.success(`Invited ${u.display_name || "user"}`);
  };

  const uninvite = async (userId: string) => {
    const { error } = await supabase
      .from("debate_invitations")
      .delete()
      .eq("debate_id", debateId)
      .eq("invited_user_id", userId);
    if (error) {
      toast.error("Couldn't remove invite");
      return;
    }
    setInvitedIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const loading = lf || lr;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
        />
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
      ) : merged.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No people to suggest yet.</p>
      ) : (
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">
          {merged.map((u) => {
            const isInvited = invitedIds.has(u.user_id);
            return (
              <li key={u.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03]">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{initials(u.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.display_name || "User"}</div>
                  {u.affiliation && (
                    <div className="text-xs text-muted-foreground truncate">{u.affiliation}</div>
                  )}
                </div>
                <button
                  onClick={() => (isInvited ? uninvite(u.user_id) : invite(u))}
                  disabled={busyId === u.user_id}
                  className={cn(
                    "h-8 px-3 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                    isInvited
                      ? "bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.08]"
                      : "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  {isInvited ? <><Check className="w-3 h-3" /> Invited</> : <><UserPlus className="w-3 h-3" /> Invite</>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default InvitePeoplePanel;