import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, Mic } from "lucide-react";
import MicTestStep from "@/components/join/MicTestStep";
import { setHandoffStream } from "@/lib/micHandoff";

interface Side {
  id: string;
  label: string;
  sort_order: number;
}

interface Participant {
  id: string;
  user_id: string;
  side_id: string | null;
  participant_role: string;
}

const JoinDebatePage = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("Joining debate…");
  const [debateId, setDebateId] = useState<string | null>(null);
  const [debateTopic, setDebateTopic] = useState("");
  const [sides, setSides] = useState<Side[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedSide, setSelectedSide] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);
  const [joining, setJoining] = useState(false);
  const [maxPerSide, setMaxPerSide] = useState<number>(2);
  const [phase, setPhase] = useState<"pick" | "mic">("pick");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate(`/auth?redirect=/join/${code}`, { replace: true });
      return;
    }

    const loadDebate = async () => {
      // Find debate by join_code
      const { data: debate, error } = await supabase
        .from("debates")
        .select("id, topic")
        .eq("join_code", code?.toUpperCase())
        .single();

      if (error || !debate) {
        setStatus("Invalid join code.");
        toast.error("Debate not found with this code.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      // Check if already a participant
      const { data: existing } = await supabase
        .from("debate_participants")
        .select("id")
        .eq("debate_id", debate.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.success("Rejoining debate!");
        navigate(`/debate/${debate.id}`, { replace: true });
        return;
      }

      // Fetch sides and participants to determine availability
      const [debateMetaRes, sidesRes, partsRes] = await Promise.all([
        supabase.from("debates").select("max_speakers_per_side").eq("id", debate.id).single(),
        supabase.from("debate_sides").select("*").eq("debate_id", debate.id).order("sort_order"),
        supabase.from("debate_participants").select("*").eq("debate_id", debate.id),
      ]);

      const debateSides = (sidesRes.data || []) as Side[];
      const debateParticipants = (partsRes.data || []) as Participant[];
      const cap = (debateMetaRes.data as any)?.max_speakers_per_side ?? 2;

      setDebateId(debate.id);
      setDebateTopic(debate.topic);
      setSides(debateSides);
      setParticipants(debateParticipants);
      setMaxPerSide(cap);

      // Auto-select the only open side, if exactly one has room
      const openSides = debateSides.filter((s) => {
        const cnt = debateParticipants.filter(
          (p) => p.side_id === s.id && p.participant_role === "speaker"
        ).length;
        return cnt < cap;
      });
      if (openSides.length === 1) {
        setSelectedSide(openSides[0].id);
      }

      // Always show side picker — multiple speakers can join the same side
      setShowPicker(true);
      setStatus("");
    };

    loadDebate();
  }, [code, user, authLoading, navigate]);

  const speakersPerSide = sides.map((side) => ({
    ...side,
    speakerCount: participants.filter(
      (p) => p.side_id === side.id && p.participant_role === "speaker"
    ).length,
  }));

  const handleProceedToMic = () => {
    if (!selectedSide || !debateId || joining) return;
    setPhase("mic");
  };

  const finalizeJoin = async (stream: MediaStream | null) => {
    if (!debateId || !user || joining) return;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("join_debate_in_person", {
        _code: (code || "").toUpperCase(),
        _side_id: selectedSide || null,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? (data[0] as any) : (data as any);
      if (result?.became_audience) {
        toast("That side filled up — joining as audience.", { duration: 4000 });
      } else {
        toast.success("Joined as speaker!");
      }
      // Hand off the live stream so the debate room can use it without re-prompting
      if (stream) setHandoffStream(stream);
      navigate(`/debate/${debateId}`, { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to join debate.");
      setJoining(false);
      stream?.getTracks().forEach((t) => t.stop());
    }
  };

  const handleJoinAsAudience = () => {
    if (!debateId) return;
    // Audience view doesn't require auth — route directly
    navigate(`/debate/${debateId}/audience`, { replace: true });
  };

  if (!showPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-body">{status}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-xl">
            {phase === "pick" ? "Join Debate" : "Test your mic"}
          </CardTitle>
          <CardDescription className="font-body mt-1">
            {debateTopic}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {phase === "pick" ? (
            <>
              <div>
                <p className="text-sm font-medium text-foreground mb-3 font-body">
                  Choose a side to speak for:
                </p>
                <RadioGroup value={selectedSide} onValueChange={setSelectedSide} className="space-y-2">
                  {speakersPerSide.map((side) => {
                    const full = side.speakerCount >= maxPerSide;
                    return (
                      <label
                        key={side.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                          full
                            ? "border-border opacity-50 cursor-not-allowed"
                            : selectedSide === side.id
                            ? "border-primary bg-primary/5 cursor-pointer"
                            : "border-border hover:border-primary/50 cursor-pointer"
                        }`}
                      >
                        <RadioGroupItem value={side.id} disabled={full} />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground font-body">
                            {side.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {full
                              ? "Full — pick the other side or join as audience"
                              : `${side.speakerCount} of ${maxPerSide} speaker${maxPerSide !== 1 ? "s" : ""}`}
                          </span>
                        </div>
                        <Mic className="w-4 h-4 text-muted-foreground" />
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleProceedToMic}
                  disabled={!selectedSide || joining}
                  className="w-full"
                >
                  <Mic className="w-4 h-4 mr-1" />
                  Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={handleJoinAsAudience}
                  disabled={joining}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Join as Audience
                </Button>
              </div>
            </>
          ) : (
            <MicTestStep
              continueLabel={joining ? "Joining…" : "Join debate"}
              onReady={(stream) => finalizeJoin(stream)}
              onSkipToAudience={handleJoinAsAudience}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinDebatePage;
