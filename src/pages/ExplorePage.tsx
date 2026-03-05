import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, TrendingUp, Sparkles, Search } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DebateCard from "@/components/DebateCard";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "local", label: "Local", icon: MapPin },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "foryou", label: "For You", icon: Sparkles },
] as const;

const mockData: Record<string, Array<{ topic: string; date: string; participants: number; arguments: number; community?: string; verified?: boolean; status?: "live" | "completed" }>> = {
  local: [
    { topic: "Should our city invest in a new light rail line?", date: "5h ago", participants: 8, arguments: 34, community: "Portland City Council", verified: true, status: "live" },
    { topic: "Park funding allocation for 2026", date: "2 days ago", participants: 5, arguments: 19, community: "Portland, OR", verified: true },
  ],
  trending: [
    { topic: "Is AI art real art?", date: "12h ago", participants: 12, arguments: 67, status: "live" },
    { topic: "Should voting be mandatory?", date: "1 day ago", participants: 6, arguments: 42 },
    { topic: "Nuclear energy: solution or risk?", date: "3 days ago", participants: 8, arguments: 55 },
  ],
  foryou: [
    { topic: "Does social media do more harm than good for democracy?", date: "1 week ago", participants: 5, arguments: 31 },
    { topic: "Should school start times be pushed to 9am?", date: "3 days ago", participants: 3, arguments: 18, community: "Education" },
  ],
};

const ExplorePage = () => {
  const [activeTab, setActiveTab] = useState<string>("local");

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="text-3xl font-display font-bold mb-6">Explore</h2>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search topics, arguments, communities..."
              className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {mockData[activeTab]?.map((d, i) => (
              <motion.div
                key={`${activeTab}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <DebateCard {...d} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
