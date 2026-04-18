import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, X, MessageSquare, ArrowLeft, Bell, ThumbsUp, Clock } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { createNotification } from "@/lib/notifications";

interface Invitation {
  id: string;
  debate_id: string;
  invited_username: string;
  status: string;
  side_id: string | null;
  created_at: string;
  debate_topic: string;
  publisher_name: string;
  side_label: string | null;
}

interface Side {
  id: string;
  label: string;
  sort_order: number;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidePickerFor, setSidePickerFor] = useState<string | null>(null);
  const [availableSides, setAvailableSides] = useState<Side[]>([]);
  const [selectedSide, setSelectedSide] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const { items: notifications, markRead, markAllRead, unreadCount } = useNotifications();

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.is_read) await markRead(n.id);
    if (n.type === "interest_received" && n.debate_id) {
      // Publisher engages → send back to debate room/template to update time
      navigate(`/debate/${n.debate_id}`);
      return;
    }
    if (n.type === "time_proposed" && n.debate_id && user) {
      // Requester confirms with thumbs up
      await createNotification({
        recipient_id: (n.metadata as any)?.publisher_id || n.actor_id || "",
        actor_id: user.id,
        debate_id: n.debate_id,
        type: "interest_confirmed",
        title: "👍 Confirmed attendance",
        body: `Thumbs up for the new time.`,
        metadata: { debate_topic: (n.metadata as any)?.debate_topic },
      });
      toast.success("Confirmation sent");
      navigate(`/debate/${n.debate_id}`);
      return;
    }
    if (n.debate_id) navigate(`/debate/${n.debate_id}`);
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: invites } = await supabase
        .from("debate_invitations")
        .select("*")
        .eq("invited_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!invites || invites.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch debate details and publisher profiles
      const debateIds = [...new Set(invites.map((i) => i.debate_id))];
      const [debatesRes, sidesRes] = await Promise.all([
        supabase.from("debates").select("id, topic, created_by").in("id", debateIds),
        supabase.from("debate_sides").select("*").in("debate_id", debateIds),
      ]);

      const debates = debatesRes.data || [];
      const sides = sidesRes.data || [];

      // Fetch publisher names
      const creatorIds = [...new Set(debates.map((d) => d.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", creatorIds);

      const enriched: Invitation[] = invites.map((inv) => {
        const debate = debates.find((d) => d.id === inv.debate_id);
        const profile = profiles?.find((p) => p.user_id === debate?.created_by);
        const side = inv.side_id ? sides.find((s) => s.id === inv.side_id) : null;
        return {
          ...inv,
          debate_topic: debate?.topic || "Unknown debate",
          publisher_name: profile?.display_name || "Unknown",
          side_label: side?.label || null,
        };
      });

      setInvitations(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAccept = async (invitation: Invitation) => {
    if (!user) return;

    // If no side pre-assigned, show side picker
    if (!invitation.side_id) {
      setProcessing(invitation.id);
      const { data: sides } = await supabase
        .from("debate_sides")
        .select("*")
        .eq("debate_id", invitation.debate_id)
        .order("sort_order");
      setAvailableSides(sides || []);
      setSidePickerFor(invitation.id);
      setProcessing(null);
      return;
    }

    await joinDebate(invitation, invitation.side_id);
  };

  const handleAcceptWithSide = async (invitation: Invitation) => {
    if (!selectedSide) {
      toast.error("Please select a side");
      return;
    }
    await joinDebate(invitation, selectedSide);
    setSidePickerFor(null);
    setSelectedSide("");
  };

  const joinDebate = async (invitation: Invitation, sideId: string) => {
    if (!user) return;
    setProcessing(invitation.id);

    // Update invitation status
    await supabase
      .from("debate_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    // Join as participant
    const { error } = await supabase.from("debate_participants").insert({
      debate_id: invitation.debate_id,
      user_id: user.id,
      participant_role: "speaker",
      side_id: sideId,
    });

    if (error) {
      toast.error("Failed to join debate");
      setProcessing(null);
      return;
    }

    toast.success("Joined debate!");
    setInvitations((prev) =>
      prev.map((i) => (i.id === invitation.id ? { ...i, status: "accepted" } : i))
    );
    setProcessing(null);
    navigate(`/debate/${invitation.debate_id}`);
  };

  const handleDecline = async (invitationId: string) => {
    setProcessing(invitationId);
    await supabase
      .from("debate_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);

    setInvitations((prev) =>
      prev.map((i) => (i.id === invitationId ? { ...i, status: "declined" } : i))
    );
    setProcessing(null);
    toast.info("Invitation declined");
  };

  const pending = invitations.filter((i) => i.status === "pending");
  const past = invitations.filter((i) => i.status !== "pending");

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-display font-bold">Notifications</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm font-body">Loading…</p>
        ) : invitations.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl px-6 py-12 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-body text-foreground mb-1">No notifications yet</p>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Invitations to debates will show up here.
            </p>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors"
            >
              Explore debates
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Invitations
                </h2>
                {pending.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-semibold text-foreground truncate">
                            {inv.debate_topic}
                          </p>
                          <p className="text-xs text-muted-foreground font-body mt-0.5">
                            Invited by <span className="text-foreground font-medium">{inv.publisher_name}</span>
                          </p>
                          {inv.side_label && (
                            <p className="text-xs text-primary font-medium mt-1">
                              Assigned side: {inv.side_label}
                            </p>
                          )}
                        </div>

                        {sidePickerFor === inv.id ? (
                          <div className="space-y-3 w-full mt-2">
                            <p className="text-xs font-medium text-foreground">Choose your side:</p>
                            <RadioGroup value={selectedSide} onValueChange={setSelectedSide} className="space-y-2">
                              {availableSides.map((side) => (
                                <label
                                  key={side.id}
                                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                    selectedSide === side.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <RadioGroupItem value={side.id} />
                                  <span className="text-sm font-medium font-body">{side.label}</span>
                                </label>
                              ))}
                            </RadioGroup>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptWithSide(inv)}
                                disabled={!selectedSide || processing === inv.id}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Join
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSidePickerFor(null); setSelectedSide(""); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleAccept(inv)}
                              disabled={processing === inv.id}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDecline(inv.id)}
                              disabled={processing === inv.id}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Past
                </h2>
                {past.map((inv) => (
                  <Card key={inv.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-display font-medium text-foreground truncate">
                            {inv.debate_topic}
                          </p>
                          <p className="text-xs text-muted-foreground font-body">
                            From {inv.publisher_name} · {inv.status}
                          </p>
                        </div>
                        {inv.status === "accepted" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/debate/${inv.debate_id}`)}
                          >
                            Open
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NotificationsPage;
