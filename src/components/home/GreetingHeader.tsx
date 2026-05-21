import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { monoGradientFromSeed } from "@/lib/gradient";
import { useUserAverageGrade } from "@/hooks/useUserAverageGrade";
import ProfileIdCard from "@/components/profile/ProfileIdCard";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const scoreLabel = (score: number) => {
  if (score >= 9) return "Exceptional";
  if (score >= 7) return "Strong";
  if (score >= 5) return "Developing";
  if (score >= 3) return "Needs Work";
  return "Insufficient";
};

const GreetingHeader = () => {
  const { user, profile } = useAuth();
  const [showGreeting, setShowGreeting] = useState(true);
  const { average, count } = useUserAverageGrade();

  useEffect(() => {
    const t = setTimeout(() => setShowGreeting(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const displayName =
    profile?.display_name?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  // Logged-out: show a welcome banner where the avatar/banner would be.
  if (!user) {
    return (
      <div className="relative min-h-[160px] sm:min-h-[150px] mb-0">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <div
            className="h-[100px] sm:h-[110px] w-full rounded-2xl border border-border overflow-hidden flex items-center justify-center"
            style={{ backgroundImage: monoGradientFromSeed("dynamo-welcome") }}
          >
            <h2 className="font-display text-2xl sm:text-3xl text-background tracking-tight">
              Welcome to DYNAMO!
            </h2>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[220px] sm:min-h-[240px] mb-0">
      <AnimatePresence mode="wait">
        {showGreeting ? (
          <motion.div
            key="greeting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 flex items-start"
          >
            <h2 className="text-2xl sm:text-[28px] font-display leading-tight">
              {getGreeting()}, {displayName}.
            </h2>
          </motion.div>
        ) : (
          <motion.div
            key="header"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <div className="relative">
              <ProfileIdCard variant="display" />
              {average !== null && (
                <div
                  className="absolute top-2 right-2 z-10 flex flex-col items-end gap-0 px-2 py-1 rounded-md bg-background/70 backdrop-blur border border-border/60"
                  title={`Average overall performance across ${count} graded debate${count === 1 ? "" : "s"}`}
                >
                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground font-body">
                    <Award className="w-3 h-3" />
                    Avg
                  </div>
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="font-display text-base tabular-nums">{average.toFixed(1)}</span>
                    <span className="text-[9px] font-body text-muted-foreground">/ 10</span>
                  </div>
                  <span className="text-[9px] font-body text-muted-foreground">{scoreLabel(average)}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GreetingHeader;
