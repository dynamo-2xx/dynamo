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

  const statusColor = (s: string) => {
    if (s === "live") return "bg-green-500/20 text-green-400";
    if (s === "completed") return "bg-primary/20 text-primary";
    return "bg-muted text-muted-foreground";
  };

  const DebateLink = ({ d }: { d: DebateRow }) => (
    <Link
      to={`/debate/${d.id}`}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors block"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-foreground text-sm">{d.topic}</h3>
          <p className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${statusColor(d.status)}`}>
          {d.status}
        </span>
      </div>
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">Good evening.</h2>
        <p className="text-muted-foreground mb-8">What do you want to debate today?</p>

        <Link
          to="/create"
          className="flex items-center gap-3 bg-card border border-border hover:border-primary/50 rounded-xl p-5 mb-10 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm group-hover:text-primary transition-colors">Create</p>
            <p className="text-xs text-muted-foreground">Type a topic and let dynamo structure the conversation</p>
          </div>
        </Link>

        {liveDebates.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">Happening Now</h3>
            </div>
            <div className="grid gap-3 mb-10">
              {liveDebates.map((d) => <DebateLink key={d.id} d={d} />)}
            </div>
          </>
        )}

        {recentDebates.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">Recent Debates</h3>
            </div>
            <div className="grid gap-3">
              {recentDebates.map((d) => <DebateLink key={d.id} d={d} />)}
            </div>
          </>
        )}

        {liveDebates.length === 0 && recentDebates.length === 0 && (
          <p className="text-muted-foreground text-center py-12">No public debates yet. Be the first to start one!</p>
        )}
      </motion.div>
    </div>
  );
};

export default HomePage;
