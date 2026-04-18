import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { monoGradientFromSeed } from "@/lib/gradient";
import { useUserAverageGrade } from "@/hooks/useUserAverageGrade";

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
  const handle = (profile?.display_name || user?.email?.split("@")[0] || "you")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const bannerStyle = profile?.banner_url
    ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: monoGradientFromSeed(user?.id || displayName) };

  return (
    <div className="relative min-h-[200px] sm:min-h-[180px] mb-2">
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
            <div
              className="h-[100px] sm:h-[110px] w-full rounded-2xl border border-border overflow-hidden"
              style={bannerStyle}
              aria-hidden
            />
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-8 px-1">
              <div className="flex items-end gap-3 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-full ring-4 ring-background bg-accent overflow-hidden shrink-0 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display text-lg text-foreground">{initials}</span>
                  )}
                </div>
                <div className="pb-1 flex-1 min-w-0">
                  <p className="font-display text-lg leading-tight truncate">{displayName}</p>
                  <p className="font-body text-xs text-muted-foreground">@{handle}</p>
                </div>
              </div>
              {average !== null && (
                <div
                  className="shrink-0 flex items-center sm:flex-col sm:items-end gap-2 sm:gap-0 pl-[76px] sm:pl-0 sm:pb-1"
                  title={`Average overall performance across ${count} graded debate${count === 1 ? "" : "s"}`}
                >
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground font-body">
                    <Award className="w-3 h-3" />
                    Avg
                  </div>
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="font-display text-lg tabular-nums">{average.toFixed(1)}</span>
                    <span className="text-[10px] font-body text-muted-foreground">/ 10</span>
                  </div>
                  <span className="text-[10px] font-body text-muted-foreground">{scoreLabel(average)}</span>
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
