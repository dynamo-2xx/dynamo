import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Eye, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface Side {
  id: string;
  label: string;
  sort_order: number;
  taken?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debateId: string;
  debateTopic: string;
  debateStatus: string;
  createdBy: string;
}

const InterestedDialog = ({ open, onOpenChange, debateId, debateTopic, debateStatus, createdBy }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sides, setSides] = useState<Side[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actorName, setActorName] = useState<string>("Someone");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sidesData }, { data: parts }, { data: interests }] = await Promise.all([
        supabase.from("debate_sides").select("*").eq("debate_id", debateId).order("sort_order"),
        supabase.from("debate_participants").select("side_id, participant_role").eq("debate_id", debateId),
        (supabase as any)
          .from("debate_interests")
          .select("side_id, role, status")
          .eq("debate_id", debateId)
          .neq("status", "cancelled")
          .neq("status", "declined"),
      ]);
      if (cancelled) return;
      const claimedSpeakerSides = new Set<string>([
        ...(parts || [])
          .filter((p: any) => p.participant_role === "speaker" && p.side_id)
          .map((p: any) => p.side_id as string),
        ...(interests || [])
          .filter((i: any) => i.role === "speaker" && i.side_id)
          .map((i: any) => i.side_id as string),
      ]);
      setSides(
        ((sidesData || []) as Side[]).map((s) => ({ ...s, taken: claimedSpeakerSides.has(s.id) })),
      );
      setLoading(false);
    })();
    if (user) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setActorName(data?.display_name || "Someone"));
    }
    return () => {
      cancelled = true;
    };
  }, [open, debateId, user]);

  const isLive = debateStatus === "live";

  const claim = async (role: "speaker" | "spectator", sideId: string | null, sideLabel?: string) => {
    if (!user) {
      toast.error("Sign in to express interest");
      return;
    }
    if (user.id === createdBy) {
      toast.error("You're the publisher of this debate");
      return;
    }
    setSubmitting(true);

    // 1. Insert the interest
    const { data: interest, error } = await (supabase as any)
      .from("debate_interests")
      .insert({
        debate_id: debateId,
        user_id: user.id,
        role,
        side_id: sideId,
      })
      .select("id")
      .single();

    if (error) {
      // Likely a unique-constraint conflict — already expressed interest.
      if ((error as any).code === "23505") {
        toast.info("You've already expressed interest");
      } else {
        toast.error(error.message || "Couldn't save interest");
      }
      setSubmitting(false);
      return;
    }

    // 2. If the debate is live, the user can join immediately as a participant.
    if (isLive) {
      await supabase.from("debate_participants").insert({
        debate_id: debateId,
        user_id: user.id,
        side_id: sideId,
        participant_role: role,
      });
      await (supabase as any)
        .from("debate_interests")
        .update({ status: "confirmed" })
        .eq("id", interest.id);
      onOpenChange(false);
      toast.success("Joined!");
      navigate(`/debate/${debateId}`);
      setSubmitting(false);
      return;
    }

    // 3. Otherwise, ping the publisher.
    const roleLabel = role === "speaker" ? `as ${sideLabel}` : "as a spectator";
    await createNotification({
      recipient_id: createdBy,
      actor_id: user.id,
      debate_id: debateId,
      interest_id: interest.id,
      type: "interest_received",
      title: `${actorName} wants to join your debate ${roleLabel}`,
      body: `Set a time so they can confirm.`,
      metadata: { role, side_id: sideId, side_label: sideLabel ?? null, debate_topic: debateTopic },
    });

    onOpenChange(false);
    toast.success("Interest sent — the publisher will be notified");
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Join this debate</DialogTitle>
          <DialogDescription className="text-xs font-body">
            {isLive
              ? "Pick how you'd like to join — you'll enter the room right away."
              : "Pick how you'd like to join. The publisher will be notified to set a time."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {sides.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-2">
                  Speak as a side
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {sides.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={submitting || s.taken}
                      onClick={() => claim("speaker", s.id, s.label)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors text-sm font-body",
                        s.taken
                          ? "border-border bg-accent text-muted-foreground cursor-not-allowed"
                          : "border-border bg-background hover:border-foreground/30 hover:bg-accent/50",
                      )}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Users className="w-4 h-4" />
                        {s.label}
                      </span>
                      {s.taken ? (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Taken</span>
                      ) : (
                        <Check className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-2">
                Or just watch
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => claim("spectator", null)}
                className="w-full flex items-center justify-between rounded-lg border border-border bg-background hover:border-foreground/30 hover:bg-accent/50 px-4 py-3 text-left transition-colors text-sm font-body"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Eye className="w-4 h-4" />
                  Join as spectator
                </span>
                <Check className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InterestedDialog;
