import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProjectorView from "@/components/debate/ProjectorView";

interface DebateData {
  id: string; topic: string; status: string;
  time_per_turn: string; turns_per_subtopic: number;
  current_subtopic_index: number; current_turn: number;
  current_speaker_side_id: string | null; turn_started_at: string | null;
}
interface Side { id: string; label: string; sort_order: number; }
interface Subtopic { id: string; title: string; sort_order: number; }
interface Argument {
  id: string; content: string; argument_type: string;
  participant_id: string; subtopic_id: string; created_at: string;
  is_edited: boolean; original_content: string | null;
  parent_argument_id: string | null;
}
interface Participant {
  id: string; user_id: string; side_id: string | null; participant_role: string;
}

function parseTimeToSeconds(t: string): number {
  if (t.includes("min")) return parseInt(t) * 60;
  if (t.includes("s")) return parseInt(t);
  return 120;
}

const ProjectorPage = () => {
  const { id } = useParams<{ id: string }>();
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [sides, setSides] = useState<Side[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [args, setArgs] = useState<Argument[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [dRes, sRes, stRes, aRes, pRes] = await Promise.all([
        supabase.from("debates").select("*").eq("id", id).single(),
        supabase.from("debate_sides").select("*").eq("debate_id", id).order("sort_order"),
        supabase.from("debate_subtopics").select("*").eq("debate_id", id).order("sort_order"),
        supabase.from("arguments").select("*").eq("debate_id", id).order("created_at"),
        supabase.from("debate_participants").select("*").eq("debate_id", id),
      ]);
      if (!dRes.data) return;
      const d = dRes.data as unknown as DebateData;
      setDebate(d);
      setSides(sRes.data || []);
      setSubtopics(stRes.data || []);
      setArgs(aRes.data || []);
      setParticipants((pRes.data || []) as unknown as Participant[]);

      if (d.turn_started_at && d.status === "live") {
        const elapsed = Math.floor((Date.now() - new Date(d.turn_started_at).getTime()) / 1000);
        const remaining = Math.max(0, parseTimeToSeconds(d.time_per_turn) - elapsed);
        setTimeLeft(remaining);
        if (remaining > 0) setTimerRunning(true);
      } else {
        setTimeLeft(parseTimeToSeconds(d.time_per_turn));
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`projector-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "arguments", filter: `debate_id=eq.${id}` }, (payload) => {
        setArgs((prev) => [...prev, payload.new as Argument]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "arguments", filter: `debate_id=eq.${id}` }, (payload) => {
        setArgs((prev) => prev.map((a) => a.id === (payload.new as Argument).id ? (payload.new as Argument) : a));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "debates", filter: `id=eq.${id}` }, (payload) => {
        const updated = payload.new as unknown as DebateData;
        setDebate(updated);
        if (updated.turn_started_at && updated.status === "live") {
          const elapsed = Math.floor((Date.now() - new Date(updated.turn_started_at).getTime()) / 1000);
          const remaining = Math.max(0, parseTimeToSeconds(updated.time_per_turn) - elapsed);
          setTimeLeft(remaining);
          if (remaining > 0) setTimerRunning(true);
          else setTimerRunning(false);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setTimerRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  if (loading || !debate) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <p className="text-primary-foreground font-body opacity-60">Loading projector view…</p>
      </div>
    );
  }

  return (
    <ProjectorView
      debate={debate}
      sides={sides}
      subtopics={subtopics}
      arguments={args}
      participants={participants}
      timeLeft={timeLeft}
    />
  );
};

export default ProjectorPage;
