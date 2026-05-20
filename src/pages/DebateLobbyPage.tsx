import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import MicLobby from "@/components/lobby/MicLobby";
import InPersonJoinPanel from "@/components/create/InPersonJoinPanel";
import { toast } from "sonner";

interface Side { id: string; label: string; sort_order: number; }

/**
 * Owner pre-live lobby for a Debate room. Shows the join code/QR, expected
 * slots per side, and gates Start on at least one connected mic.
 */
export default function DebateLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [maxPerSide, setMaxPerSide] = useState(2);
  const [sides, setSides] = useState<Side[]>([]);
  const [starting, setStarting] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [overdueMin, setOverdueMin] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: d } = await supabase
        .from("debates")
        .select("topic, join_code, max_speakers_per_side, created_by, status, scheduled_at")
        .eq("id", id)
        .maybeSingle();
      if (!d) {
        toast.error("Debate not found");
        navigate("/");
        return;
      }
      if (d.status === "live") {
        navigate(`/debate/${id}`, { replace: true });
        return;
      }
      if (user && d.created_by !== user.id) {
        navigate(`/debate/${id}`, { replace: true });
        return;
      }
      setTopic(d.topic);
      setJoinCode(d.join_code);
      setMaxPerSide(d.max_speakers_per_side ?? 2);
      setScheduledAt((d as any).scheduled_at ?? null);
      const { data: s } = await supabase
        .from("debate_sides")
        .select("*")
        .eq("debate_id", id)
        .order("sort_order");
      setSides((s ?? []) as Side[]);
    })();
  }, [id, user, navigate]);

  // §4 owner no-show banner — surfaces +15m past scheduled start.
  useEffect(() => {
    if (!scheduledAt) { setOverdueMin(0); return; }
    const tick = () => {
      const diffMs = Date.now() - new Date(scheduledAt).getTime();
      setOverdueMin(Math.max(0, Math.floor(diffMs / 60000)));
    };
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, [scheduledAt]);

  const handleCancel = async () => {
    if (!id) return;
    const ok = window.confirm("Cancel this debate? Invitees will be notified.");
    if (!ok) return;
    const { error } = await supabase
      .from("debates")
      .update({ status: "archived", ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Debate cancelled");
    navigate("/", { replace: true });
  };

  const slots = sides.flatMap((s) =>
    Array.from({ length: maxPerSide }).map((_, i) => ({
      key: `${s.id}:${i}`,
      label: `${s.label} · seat ${i + 1}`,
      hint: "Open seat — share the code",
    })),
  );

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    const { error } = await supabase
      .from("debates")
      .update({ status: "live", started_at: new Date().toISOString() })
      .eq("id", id);
    setStarting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(`/debate/${id}`, { replace: true });
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Lobby</p>
          <h1 className="font-display text-2xl text-foreground">{topic}</h1>
        </div>
        {overdueMin >= 15 && (
          <div className="border border-foreground/10 rounded-lg p-3 bg-amber-50 text-sm font-body text-foreground flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">Running {overdueMin}m late</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start now, or cancel to free everyone's slot.</p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="shrink-0 text-xs underline underline-offset-2 hover:no-underline"
            >
              Cancel debate
            </button>
          </div>
        )}
        <InPersonJoinPanel
          debateId={id ?? null}
          joinCode={joinCode}
          maxSpeakersPerSide={maxPerSide}
          onMaxSpeakersChange={async (n) => {
            setMaxPerSide(n);
            if (id) await supabase.from("debates").update({ max_speakers_per_side: n }).eq("id", id);
          }}
          onCodeRegenerated={(c) => setJoinCode(c)}
        />
        <MicLobby
          kind="debate"
          sessionId={id ?? null}
          slots={slots}
          minConnected={1}
          onStart={handleStart}
          starting={starting}
          startLabel="Start debate"
        />
      </div>
    </AppLayout>
  );
}