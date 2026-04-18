import { motion } from "framer-motion";
import { PlusCircle, Radio, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import GreetingHeader from "@/components/home/GreetingHeader";
import RotatingTagline from "@/components/home/RotatingTagline";
import AutoCarousel from "@/components/home/AutoCarousel";
import DebateCoverCard from "@/components/home/DebateCoverCard";
import { useForYouDebates, useMyRecentDebates } from "@/hooks/useHomeDebates";
import LocationPrompt from "@/components/home/LocationPrompt";
import FriendsOnlineWidget from "@/components/home/FriendsOnlineWidget";

type Mode = "trending" | "local";

const SectionHeader = ({
  title,
  toRoute,
  right,
}: {
  title: string;
  toRoute: string;
  right?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 mb-3">
    <div className="flex items-center gap-3 min-w-0">
      <h3 className="font-display text-lg truncate">{title}</h3>
      {right}
    </div>
    <Link
      to={toRoute}
      aria-label={`Open ${title}`}
      className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
    >
      <ArrowUpRight className="w-4 h-4" />
    </Link>
  </div>
);

const HomePage = () => {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("trending");
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const hasLocation = !!profile?.location;
  const { items: forYou } = useForYouDebates(mode, 12);
  const { items: myRecent } = useMyRecentDebates(12);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Greeting → header swap */}
        <GreetingHeader />

        {/* Persistent tagline */}
        <RotatingTagline className="mb-8" />

        <FriendsOnlineWidget />

        {/* Action row: Create + Live side-by-side */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <Link
            to="/create"
            className="flex items-center gap-3 bg-background border border-border hover:border-foreground/20 rounded-lg p-5 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
              <PlusCircle className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-body text-sm font-medium">Create</p>
              <p className="text-[11px] text-muted-foreground font-body truncate">Structure a debate</p>
            </div>
          </Link>
          <Link
            to="/live/new"
            className="flex items-center gap-3 bg-background border border-border hover:border-foreground/20 rounded-lg p-5 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-body text-sm font-medium">Live</p>
              <p className="text-[11px] text-muted-foreground font-body truncate">Capture a real conversation</p>
            </div>
          </Link>
        </div>

        {/* For-you carousel */}
        <section className="mb-10">
          <SectionHeader
            title="Conversations that may concern you"
            toRoute="/for-you"
            right={
              <div className="inline-flex border border-border rounded-full p-0.5 shrink-0">
                <button
                  onClick={() => setMode("trending")}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-body transition-colors ${mode === "trending" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  Trending
                </button>
                <button
                  onClick={() => {
                    if (!hasLocation) setLocationPromptOpen(true);
                    else setMode("local");
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-body transition-colors ${mode === "local" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  Local
                </button>
              </div>
            }
          />
          <AutoCarousel
            items={forYou}
            getKey={(d) => d.id}
            renderItem={(d) => <DebateCoverCard d={d} />}
          />
        </section>

        {/* My Recent carousel */}
        <section>
          <SectionHeader title="My Recent" toRoute="/my-recent" />
          <AutoCarousel
            items={myRecent}
            getKey={(d) => d.id}
            renderItem={(d) => <DebateCoverCard d={d} />}
          />
        </section>
      </motion.div>

      <LocationPrompt
        open={locationPromptOpen}
        onOpenChange={setLocationPromptOpen}
        onSaved={() => setMode("local")}
      />
    </div>
  );
};

export default HomePage;
