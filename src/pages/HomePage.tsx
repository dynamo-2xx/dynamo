import { motion } from "framer-motion";
import { PlusCircle, Radio, ArrowUpRight, Compass } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import GreetingHeader from "@/components/home/GreetingHeader";
import RotatingTagline from "@/components/home/RotatingTagline";
import AutoCarousel from "@/components/home/AutoCarousel";
import DebateCoverCard from "@/components/home/DebateCoverCard";
import { useForYouDebates, useMyRecentDebates } from "@/hooks/useHomeDebates";
import LocationPrompt from "@/components/home/LocationPrompt";
import FriendsOnlineWidget from "@/components/home/FriendsOnlineWidget";
import FindPeopleRow from "@/components/home/FindPeopleRow";
import { formatTodayLong } from "@/lib/date";
import EmptyStateHint from "@/components/home/EmptyStateHint";
import { useEmptyStateHint } from "@/hooks/useEmptyStateHint";
import AuthPromptDialog from "@/components/AuthPromptDialog";
import HomeMyStudyRow from "@/components/home/HomeMyStudyRow";

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
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<Mode>("trending");
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [highlightActions, setHighlightActions] = useState(false);
  const hasLocation = !!profile?.location;
  const { items: forYou } = useForYouDebates(mode, 12);
  const { items: myRecent } = useMyRecentDebates(12);

  const actionRowRef = useRef<HTMLDivElement>(null);
  const forYouHint = useEmptyStateHint<HTMLDivElement>();
  const myRecentHint = useEmptyStateHint<HTMLDivElement>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleProtectedAction = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setAuthPromptOpen(true);
    }
  };

  const handleScrollToActions = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setHighlightActions(true);
    window.setTimeout(() => setHighlightActions(false), 1500);
  };

  // Triggered from sidebar "Get Started" via ?highlight=actions
  useEffect(() => {
    if (searchParams.get("highlight") === "actions") {
      handleScrollToActions();
      searchParams.delete("highlight");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionCardClass = `flex items-center gap-3 bg-background border rounded-lg p-5 transition-all duration-500 group ${
    highlightActions
      ? "border-foreground/40 ring-2 ring-foreground/30"
      : "border-border hover:border-foreground/20"
  }`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Greeting → header swap */}
        <GreetingHeader />

        {/* Persistent tagline — vertically centered, left-aligned */}
        <div className="flex items-center justify-start py-6">
          <RotatingTagline />
        </div>

        {/* Action row: Create + Live side-by-side */}
        <div ref={actionRowRef} className="grid grid-cols-2 gap-3 mb-6 scroll-mt-4">
          {user ? (
            <Link to="/create" className={actionCardClass}>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5 text-foreground" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-body text-sm font-medium">Debate</p>
                <p className="text-[11px] text-muted-foreground font-body truncate">Structure a sincere dialogue</p>
              </div>
            </Link>
          ) : (
            <button type="button" onClick={handleProtectedAction} className={actionCardClass}>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5 text-foreground" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-body text-sm font-medium">Debate</p>
                <p className="text-[11px] text-muted-foreground font-body truncate">Structure a sincere dialogue</p>
              </div>
            </button>
          )}
          {user ? (
            <Link to="/live/new" className={actionCardClass}>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 text-foreground" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-body text-sm font-medium">Live</p>
                <p className="text-[11px] text-muted-foreground font-body truncate">Capture a real conversation</p>
              </div>
            </Link>
          ) : (
            <button type="button" onClick={handleProtectedAction} className={actionCardClass}>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 text-foreground" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-body text-sm font-medium">Live</p>
                <p className="text-[11px] text-muted-foreground font-body truncate">Capture a real conversation</p>
              </div>
            </button>
          )}
        </div>

        <div className="mb-10">
          <FriendsOnlineWidget />
        </div>

        {user && (
          <section className="mb-10">
            <HomeMyStudyRow />
          </section>
        )}

        <FindPeopleRow />

        {/* For-you carousel */}
        <section className="mb-10">
          <SectionHeader
            title={formatTodayLong()}
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
          {forYou.length === 0 ? (
            <div ref={forYouHint.ref} className="border border-dashed border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground font-body mb-3">
                <EmptyStateHint
                  active={forYouHint.active}
                  baseText={
                    mode === "local"
                      ? "No local conversations yet. Try Trending."
                      : "No conversations yet today."
                  }
                  hintMessages={["Break the ice!", "Move a mountain!"]}
                />
              </p>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors"
              >
                <Compass className="w-3.5 h-3.5" /> Explore
              </Link>
            </div>
          ) : (
            <AutoCarousel
              items={forYou}
              getKey={(d) => d.id}
              renderItem={(d) => <DebateCoverCard d={d} />}
            />
          )}
        </section>

        {/* My Recent carousel */}
        <section>
          <SectionHeader title="My Recent" toRoute="/my-recent" />
          {myRecent.length === 0 ? (
            <div ref={myRecentHint.ref} className="border border-dashed border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground font-body mb-3">
                <EmptyStateHint
                  active={myRecentHint.active}
                  baseText="You haven't joined a debate yet."
                  hintMessages={["Your conversations go here."]}
                />
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleScrollToActions}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-body hover:opacity-90 transition-opacity"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Create
                </button>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" /> Explore
                </Link>
              </div>
            </div>
          ) : (
            <AutoCarousel
              items={myRecent}
              getKey={(d) => d.id}
              renderItem={(d) => <DebateCoverCard d={d} />}
            />
          )}
        </section>
      </motion.div>

      <LocationPrompt
        open={locationPromptOpen}
        onOpenChange={setLocationPromptOpen}
        onSaved={() => setMode("local")}
      />
      <AuthPromptDialog open={authPromptOpen} onOpenChange={setAuthPromptOpen} />
    </div>
  );
};

export default HomePage;
