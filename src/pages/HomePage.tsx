import { motion } from "framer-motion";
import { PlusCircle, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import DebateCard from "@/components/DebateCard";

const mockDebates: Array<{ topic: string; date: string; participants: number; arguments: number; community?: string; verified?: boolean; status?: "live" | "completed" | "scheduled" }> = [
  { topic: "Should cities ban single-use plastics?", date: "2h ago", participants: 4, arguments: 12, community: "Portland, OR", verified: true, status: "live" },
  { topic: "Is remote work better for productivity?", date: "Yesterday", participants: 6, arguments: 24, community: "Tech Workers Guild" },
  { topic: "Should school start times be pushed to 9am?", date: "3 days ago", participants: 3, arguments: 18, community: "Education" },
  { topic: "Does social media do more harm than good for democracy?", date: "1 week ago", participants: 5, arguments: 31 },
];

const HomePage = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">
          Good evening.
        </h2>
        <p className="text-muted-foreground mb-8">
          What do you want to debate today?
        </p>

        <Link
          to="/create"
          className="flex items-center gap-3 bg-card border border-border hover:border-primary/50 rounded-xl p-5 mb-10 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm group-hover:text-primary transition-colors">Start a new debate</p>
            <p className="text-xs text-muted-foreground">Type a topic and let AI structure the conversation</p>
          </div>
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Happening Now</h3>
        </div>
        <div className="grid gap-3 mb-10">
          {mockDebates.filter(d => d.status === "live").map((d, i) => (
            <DebateCard key={i} {...d} />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Recent Debates</h3>
        </div>
        <div className="grid gap-3">
          {mockDebates.filter(d => d.status !== "live").map((d, i) => (
            <DebateCard key={i} {...d} />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;
