import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserPlus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFollowing, useRecommendedUsers, type ConnectionUser } from "@/hooks/useConnections";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Side {
  id: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debateId: string;
  debateTopic: string;
  sides: Side[];
}

const InviteFriendsDialog = ({ open, onOpenChange, debateId, debateTopic, sides }: Props) => {
  const { users: following, loading: loadingFollowing } = useFollowing();
  const { users: recommended, loading: loadingRec } = useRecommendedUsers(15);
  const [query, setQuery] = useState("");
  const [selectedSideId, setSelectedSideId] = useState<string | null>(sides[0]?.id ?? null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [alreadyInvitedIds, setAlreadyInvitedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  // Load existing invitations once when opened
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("debate_invitations")
        .select("invited_user_id")
        .eq("debate_id", debateId);
      setAlreadyInvitedIds(new Set((data || []).map((r: any) => r.invited_user_id)));
    })();
  }, [open, debateId]);

  const merged: ConnectionUser[] = useMemo(() => {
    const map = new Map<string, ConnectionUser>();
    following.forEach((u) => map.set(u.user_id, u));
    recommended.forEach((u) => {
      if (!map.has(u.user_id)) map.set(u.user_id, u);
    });
    const list = Array.from(map.values());
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.affiliation || "").toLowerCase().includes(q),
    );
  }, [following, recommended, query]);

  const handleInvite = async (u: ConnectionUser) => {
    if (invitedIds.has(u.user_id) || alreadyInvitedIds.has(u.user_id)) return;
    setBusyId(u.user_id);
    const { error } = await supabase.from("debate_invitations").insert({
      debate_id: debateId,
      invited_user_id: u.user_id,
      invited_username: u.display_name || "",
      side_id: selectedSideId,
    });
    setBusyId(null);
    if (error) {
      toast.error("Couldn't send invite");
      return;
    }
    setInvitedIds((prev) => new Set(prev).add(u.user_id));
    toast.success(`Invited ${u.display_name || "user"}`);
  };

  const loading = loadingFollowing || loadingRec;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="font-display text-xl">Invite people</DialogTitle>
          <DialogDescription className="font-body text-xs text-muted-foreground">
            To <span className="text-foreground">{debateTopic}</span>
          </DialogDescription>
        </DialogHeader>

        {sides.length > 0 && (
          <div className="px-5 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-2">
              Invite to side
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sides.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSideId(s.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-body border transition-colors",
                    selectedSideId === s.id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border hover:border-foreground/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedSideId(null)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-body border transition-colors",
                  selectedSideId === null
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:border-foreground/40",
                )}
              >
                Spectator
              </button>
            </div>
          </div>
        )}

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people you follow…"
              className="w-full bg-accent rounded-lg pl-9 pr-3 py-2 text-sm font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : merged.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm font-body text-muted-foreground">
                {query ? "No matches" : "No suggestions yet"}
              </p>
              <p className="text-xs font-body text-muted-foreground mt-1">
                Follow people to invite them to debates.
              </p>
            </div>
          ) : (
            <ul>
              {merged.map((u) => {
                const alreadyInvited = alreadyInvitedIds.has(u.user_id);
                const justInvited = invitedIds.has(u.user_id);
                const done = alreadyInvited || justInvited;
                return (
                  <li key={u.user_id}>
                    <div className="flex items-center gap-3 px-3 py-2 hover:bg-accent rounded-md transition-colors">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(u.display_name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium truncate">
                          {u.display_name || "Unknown"}
                        </p>
                        {u.affiliation && (
                          <p className="text-[11px] text-muted-foreground font-body truncate">
                            {u.affiliation}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInvite(u)}
                        disabled={done || busyId === u.user_id}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors shrink-0",
                          done
                            ? "bg-accent text-muted-foreground cursor-default"
                            : "bg-foreground text-background hover:opacity-90",
                        )}
                      >
                        {busyId === u.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : done ? (
                          <>
                            <Check className="w-3 h-3" />
                            Invited
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            Invite
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteFriendsDialog;
