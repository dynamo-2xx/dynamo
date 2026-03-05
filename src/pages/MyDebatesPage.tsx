import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import DebateCard from "@/components/DebateCard";

const mockMyDebates = [
  { topic: "Should our city ban single-use plastics?", date: "2h ago", participants: 4, arguments: 12, status: "live" as const },
  { topic: "Is remote work better for productivity?", date: "Yesterday", participants: 6, arguments: 24 },
  { topic: "Does social media do more harm than good for democracy?", date: "1 week ago", participants: 5, arguments: 31 },
];

const MyDebatesPage = () => (
  <AppLayout>
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-display font-bold mb-6">My Debates</h2>
        <div className="grid gap-3">
          {mockMyDebates.map((d, i) => (
            <DebateCard key={i} {...d} />
          ))}
        </div>
        {mockMyDebates.length === 0 && (
          <p className="text-muted-foreground text-center py-12">You haven't participated in any debates yet.</p>
        )}
      </motion.div>
    </div>
  </AppLayout>
);

export default MyDebatesPage;
