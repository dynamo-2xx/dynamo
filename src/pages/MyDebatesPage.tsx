import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "drafts" ? "drafts" : "debates";
  const [debates, setDebates] = useState<DebateRow[]>([]);
  const [drafts, setDrafts] = useState<DebateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Debates I created (non-draft)
      const { data: created } = await supabase
        .from("debates")
        .select("id, topic, status, created_at, is_public")
        .eq("created_by", user.id)
        .neq("status", "draft")
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
          .neq("status", "draft")
          .order("created_at", { ascending: false });
        extraDebates = (data || []) as DebateRow[];
      }

      const all = [...(created || []), ...extraDebates] as DebateRow[];
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDebates(all);

      // Drafts I created
      const { data: myDrafts } = await supabase
        .from("debates")
        .select("id, topic, status, created_at, is_public")
        .eq("created_by", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      setDrafts((myDrafts || []) as DebateRow[]);
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

  const currentList = activeTab === "drafts" ? drafts : debates;
  const emptyMessage = activeTab === "drafts"
    ? "You have no unpublished drafts."
    : "You haven't participated in any debates yet.";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Link to="/profile" className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-3xl font-display font-bold">My Agenda</h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 mb-6">
            <button
              onClick={() => setSearchParams({})}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                activeTab === "debates"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Debates
            </button>
            <button
              onClick={() => setSearchParams({ tab: "drafts" })}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                activeTab === "drafts"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Drafts
            </button>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-12 animate-pulse">Loading…</p>
          ) : currentList.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{emptyMessage}</p>
          ) : (
            <div className="grid gap-3">
              {currentList.map((d) => (
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
