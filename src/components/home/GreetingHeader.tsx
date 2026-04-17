import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { monoGradientFromSeed } from "@/lib/gradient";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const GreetingHeader = () => {
  const { user, profile } = useAuth();
  const [showGreeting, setShowGreeting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowGreeting(false), 3200);
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
    <div className="relative min-h-[180px] mb-2">
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
            <h2 className="text-[28px] font-display leading-tight">
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
              className="h-[110px] w-full rounded-2xl border border-border overflow-hidden"
              style={bannerStyle}
              aria-hidden
            />
            <div className="flex items-end gap-3 -mt-8 px-1">
              <div className="w-16 h-16 rounded-full ring-4 ring-background bg-accent overflow-hidden shrink-0 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-lg text-foreground">{initials}</span>
                )}
              </div>
              <div className="pb-1">
                <p className="font-display text-lg leading-tight">{displayName}</p>
                <p className="font-body text-xs text-muted-foreground">@{handle}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GreetingHeader;
