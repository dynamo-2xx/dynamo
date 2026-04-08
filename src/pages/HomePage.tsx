import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface DebateRow {
  id: string;
  topic: string;
  status: string;
  created_at: string;
  is_public: boolean;
}

const HomePage = () => {
  const [liveDebates, setLiveDebates] = useState<DebateRow[]>([]);
  const [recentDebates, setRecentDebates] = useState<DebateRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const [liveRes, recentRes] = await Promise.all([
        supabase.from("debates").select("id, topic, status, created_at, is_public").eq("status", "live").eq("is_public", true).order("created_at", { ascending: false }).limit(5),
        supabase.from("debates").select("id, topic, status, created_at, is_public").neq("status", "live").eq("is_public", true).order("created_at", { ascending: false }).limit(10),
      ]);
      setLiveDebates((liveRes.data || []) as DebateRow[]);
      setRecentDebates((recentRes.data || []) as DebateRow[]);
    };
    load();
  }, []);

  const statusBadge = (s: string) => {
    if (s === "live") return "bg-[#dcfce7] text-[#166534]";
    if (s === "completed") return "bg-accent text-muted-foreground";
    return "bg-accent text-muted-foreground";
  };

  const DebateLink = ({ d }: { d: DebateRow }) => (
    <Link
      to={`/debate/${d.id}`}
      className="bg-background border border-border rounded-lg p-5 hover:border-foreground/20 transition-colors block"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm text-foreground">{d.topic}</h3>
          <p className="text-[11px] text-muted-foreground mt-1 font-body">{new Date(d.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider shrink-0 ${statusBadge(d.status)}`}>
          {d.status}
        </span>
      </div>
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h2 className="text-[28px] font-display mb-2">Good evening.</h2>
        <p className="text-muted-foreground font-body text-sm mb-8">What do you want to debate today?</p>

        <Link
          to="/create"
          className="flex items-center gap-3 bg-background border border-border hover:border-foreground/20 rounded-lg p-5 mb-10 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="font-body text-sm font-medium group-hover:text-foreground transition-colors">Create</p>
            <p className="text-[11px] text-muted-foreground font-body">Type a topic and let dynamo structure the conversation</p>
          </div>
        </Link>

        {liveDebates.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-foreground" />
              <h3 className="font-display text-lg">Happening Now</h3>
            </div>
            <div className="grid gap-3 mb-10">
              {liveDebates.map((d) => <DebateLink key={d.id} d={d} />)}
            </div>
          </>
        )}

        {recentDebates.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-foreground" />
              <h3 className="font-display text-lg">Recent Debates</h3>
            </div>
            <div className="grid gap-3">
              {recentDebates.map((d) => <DebateLink key={d.id} d={d} />)}
            </div>
          </>
        )}

        {liveDebates.length === 0 && recentDebates.length === 0 && (
          <p className="text-muted-foreground text-center py-12 font-body text-sm">No public debates yet. Be the first to start one!</p>
        )}
      </motion.div>
    </div>
  );
};

export default HomePage;
