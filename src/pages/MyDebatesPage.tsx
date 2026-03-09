import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DebateRow {
  id: string;
  topic: string;
  status: string;
  created_at: string;
  is_public: boolean;
  participants_count?: number;
}

const MyDebatesPage = () => {
  const { user } = useAuth();
  const [debates, setDebates] = useState<DebateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Debates I created
      const { data: created } = await supabase
        .from("debates")
        .select("id, topic, status, created_at, is_public")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      // Debates I participate in
      const { data: participated } = await supabase
        .from("debate_participants")
        .select("debate_id")
        .eq("user_id", user.id);

      const participatedIds = (participated || []).map((p) => p.debate_id);
      const createdIds = new Set((created || []).map((d) => d.id));
      const extraIds = participatedIds.filter((id) => !createdIds.has(id));

      let extraDebates: DebateRow[] = [];
      if (extraIds.length > 0) {
        const { data } = await supabase
          .from("debates")
          .select("id, topic, status, created_at, is_public")
          .in("id", extraIds)
          .order("created_at", { ascending: false });
        extraDebates = (data || []) as DebateRow[];
      }

      const all = [...(created || []), ...extraDebates] as DebateRow[];
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDebates(all);
      setLoading(false);
    };
    load();
  }, [user]);

  const statusColor = (s: string) => {
    if (s === "live") return "bg-green-500/20 text-green-400";
    if (s === "completed") return "bg-primary/20 text-primary";
    if (s === "draft") return "bg-muted text-muted-foreground";
    return "bg-secondary text-muted-foreground";
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl font-display font-bold mb-6">My Debates</h2>
          {loading ? (
            <p className="text-muted-foreground text-center py-12 animate-pulse">Loading…</p>
          ) : debates.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">You haven't participated in any debates yet.</p>
          ) : (
            <div className="grid gap-3">
              {debates.map((d) => (
                <Link
                  key={d.id}
                  to={`/debate/${d.id}`}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display font-semibold text-foreground text-sm">{d.topic}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColor(d.status)}`}>
                      {d.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default MyDebatesPage;
