import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, MessageSquare, Clock, ChevronRight, UserPlus, LogIn } from "lucide-react";

interface DebateInfo {
  id: string;
  topic: string;
  status: string;
  time_per_turn: string;
  turns_per_subtopic: number;
  created_by: string;
}

interface Side { id: string; label: string; sort_order: number; }
interface Subtopic { id: string; title: string; sort_order: number; }
interface Participant { id: string; user_id: string; side_id: string | null; participant_role: string; }

const DebatePreviewPage = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [debate, setDebate] = useState<DebateInfo | null>(null);
  const [sides, setSides] = useState<Side[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [publisherName, setPublisherName] = useState("");
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Side selection state (for invitations without pre-assigned side)
  const [selectedSide, setSelectedSide] = useState<string>(searchParams.get("side") || "");
  const [needsSideSelection, setNeedsSideSelection] = useState(false);
  const [sideChosen, setSideChosen] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      // Find invitation by token via secure RPC (no broad anon table read)
      const { data: invList, error: invErr } = await supabase
        .rpc("get_invitation_by_token", { _token: token });
      const inv = Array.isArray(invList) ? invList[0] : invList;

      if (invErr || !inv) {
        setError("Invalid or expired invitation link.");
        setLoading(false);
        return;
      }

      setInvitation(inv);

      // Load debate data
      const [debateRes, sidesRes, subtopicsRes, partsRes] = await Promise.all([
        supabase.from("debates").select("*").eq("id", inv.debate_id).single(),
        supabase.from("debate_sides").select("*").eq("debate_id", inv.debate_id).order("sort_order"),
        supabase.from("debate_subtopics").select("*").eq("debate_id", inv.debate_id).order("sort_order"),
        supabase.from("debate_participants").select("*").eq("debate_id", inv.debate_id),
      ]);

      if (debateRes.error || !debateRes.data) {
        setError("Debate not found.");
        setLoading(false);
        return;
      }

      setDebate(debateRes.data as unknown as DebateInfo);
      setSides(sidesRes.data || []);
      setSubtopics(subtopicsRes.data || []);
      setParticipants((partsRes.data || []) as unknown as Participant[]);

      // Fetch publisher name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", debateRes.data.created_by)
        .single();
      setPublisherName(profile?.display_name || "Unknown");

      // Determine if side selection is needed
      if (!inv.side_id) {
        setNeedsSideSelection(true);
      } else {
        setSelectedSide(inv.side_id);
        setSideChosen(true);
      }

      setLoading(false);
    };
    load();
  }, [token]);

  // If user is logged in and already a participant, redirect
  useEffect(() => {
    if (authLoading || !user || !debate) return;
    const existing = participants.find((p) => p.user_id === user.id);
    if (existing) {
      navigate(`/debate/${debate.id}`, { replace: true });
    }
  }, [user, authLoading, debate, participants, navigate]);

  const handleSideSelected = () => {
    if (!selectedSide) {
      toast.error("Please choose a side");
      return;
    }
    setSideChosen(true);
  };

  const handleCreateAccount = () => {
    // Store invitation data in sessionStorage for post-auth flow
    sessionStorage.setItem("pending_invite", JSON.stringify({
      invite_token: token,
      debate_id: debate?.id,
      side_id: selectedSide,
    }));
    navigate(`/auth?redirect=/preview/${token}&mode=signup`);
  };

  const handleLogin = () => {
    sessionStorage.setItem("pending_invite", JSON.stringify({
      invite_token: token,
      debate_id: debate?.id,
      side_id: selectedSide,
    }));
    navigate(`/auth?redirect=/preview/${token}&mode=login`);
  };

  // Auto-join after authentication
  useEffect(() => {
    if (authLoading || !user || !debate || !invitation) return;

    const pending = sessionStorage.getItem("pending_invite");
    if (!pending) return;

    try {
      const data = JSON.parse(pending);
      if (data.invite_token !== token) return;

      const joinAfterAuth = async () => {
        // Check if already participant
        const { data: existing } = await supabase
          .from("debate_participants")
          .select("id")
          .eq("debate_id", data.debate_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          sessionStorage.removeItem("pending_invite");
          navigate(`/debate/${data.debate_id}`, { replace: true });
          return;
        }

        // Join as speaker on chosen side
        const { error } = await supabase.from("debate_participants").insert({
          debate_id: data.debate_id,
          user_id: user.id,
          participant_role: "speaker",
          side_id: data.side_id,
        });

        // Update invitation status
        await supabase
          .from("debate_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation.id);

        sessionStorage.removeItem("pending_invite");

        if (error) {
          toast.error("Failed to join debate");
        } else {
          toast.success("Joined debate as speaker!");
          navigate(`/debate/${data.debate_id}`, { replace: true });
        }
      };

      joinAfterAuth();
    } catch {
      sessionStorage.removeItem("pending_invite");
    }
  }, [user, authLoading, debate, invitation, token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">Loading preview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">{error}</p>
      </div>
    );
  }

  if (!debate) return null;

  // Step 1: Side selection (if needed and not yet chosen)
  if (needsSideSelection && !sideChosen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">Choose Your Side</CardTitle>
            <CardDescription className="font-body mt-1">
              {debate.topic}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">Invited by {publisherName}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedSide} onValueChange={setSelectedSide} className="space-y-2">
              {sides.map((side) => {
                const count = participants.filter(
                  (p) => p.side_id === side.id && p.participant_role === "speaker"
                ).length;
                return (
                  <label
                    key={side.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedSide === side.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={side.id} />
                    <div className="flex-1">
                      <span className="text-sm font-medium font-body">{side.label}</span>
                      {count > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {count} speaker{count !== 1 ? "s" : ""} joined
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
            <Button
              onClick={handleSideSelected}
              disabled={!selectedSide}
              className="w-full"
            >
              Continue to Preview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Debate preview with Create Account / Log In
  const sideLabel = sides.find((s) => s.id === selectedSide)?.label;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header mimicking debate room */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div>
          <h1 className="text-lg font-display font-bold text-foreground truncate max-w-md">
            {debate.topic}
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
              Preview
            </span>
            <span>Invited by {publisherName}</span>
            {sideLabel && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                {sideLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Subtopics preview */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="text-center py-6">
                <h2 className="text-xl font-display font-bold mb-2">Debate Structure</h2>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground font-body">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {debate.time_per_turn} per turn
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {debate.turns_per_subtopic} turns per subtopic
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {participants.length} joined
                  </span>
                </div>
              </div>

              {/* Sides */}
              <div className="flex gap-3 mb-4">
                {sides.map((side) => {
                  const count = participants.filter(
                    (p) => p.side_id === side.id && p.participant_role === "speaker"
                  ).length;
                  return (
                    <div
                      key={side.id}
                      className={`flex-1 rounded-lg border p-3 text-center ${
                        side.id === selectedSide
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <p className="text-sm font-display font-semibold">{side.label}</p>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        {count} speaker{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Subtopics */}
              <div className="space-y-2">
                {subtopics.map((st, i) => (
                  <div
                    key={st.id}
                    className="rounded-lg border border-border px-4 py-3 flex items-center gap-3"
                  >
                    <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-display font-medium">
                        {i + 1}. {st.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom CTA — replaces the speak button */}
          <div className="border-t border-border bg-card p-4">
            <div className="max-w-lg mx-auto">
              {sideLabel && (
                <p className="text-xs text-center text-muted-foreground font-body mb-3">
                  You'll join as a speaker for <span className="text-primary font-semibold">{sideLabel}</span>
                </p>
              )}
              {user ? (
                <p className="text-xs text-center text-muted-foreground font-body mb-2">
                  You're logged in — joining automatically…
                </p>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleCreateAccount} className="flex-1">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Create Account
                  </Button>
                  <Button variant="outline" onClick={handleLogin} className="flex-1">
                    <LogIn className="w-4 h-4 mr-1.5" />
                    Log In
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="hidden lg:flex flex-col w-80 border-l border-border bg-card/50">
          <div className="border-b border-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 font-body">
              <Users className="w-3.5 h-3.5 inline mr-1" /> Participants ({participants.length})
            </h3>
            <div className="space-y-2">
              {sides.map((side) => (
                <div key={side.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-primary">
                    {side.label}
                  </p>
                  {participants
                    .filter((p) => p.side_id === side.id)
                    .map((p) => (
                      <div key={p.id} className="text-xs text-foreground flex items-center gap-1.5 font-body">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {p.user_id.slice(0, 8)}
                        <span className="text-[9px] text-muted-foreground ml-1">
                          ({p.participant_role})
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 font-body">
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Subtopics
            </h3>
            <div className="space-y-2">
              {subtopics.map((st, i) => (
                <div key={st.id} className="rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium font-display">{i + 1}. {st.title}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DebatePreviewPage;
