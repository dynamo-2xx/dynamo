import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForYouDebates } from "@/hooks/useHomeDebates";
import { useAuth } from "@/contexts/AuthContext";
import DebateCoverCard from "@/components/home/DebateCoverCard";
import AppLayout from "@/components/AppLayout";

type Mode = "trending" | "local";

const ForYouPage = () => {
  const [mode, setMode] = useState<Mode>("trending");
  const { profile } = useAuth();
  const { items, loading } = useForYouDebates(mode, 60);
  const localDisabled = !profile?.location;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <Link
            to="/explore"
            className="text-sm font-body text-foreground hover:underline"
          >
            Explore →
          </Link>
        </div>

        <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
          <h1 className="text-[24px] font-display">Conversations that may concern you</h1>
          <div className="inline-flex border border-border rounded-full p-0.5">
            <button
              onClick={() => setMode("trending")}
              className={`px-3 py-1 rounded-full text-xs font-body transition-colors ${mode === "trending" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Trending
            </button>
            <button
              onClick={() => !localDisabled && setMode("local")}
              disabled={localDisabled}
              title={localDisabled ? "Set your location in your profile to see local debates" : undefined}
              className={`px-3 py-1 rounded-full text-xs font-body transition-colors disabled:opacity-40 ${mode === "local" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Local
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm font-body">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm font-body py-12 text-center">
            {mode === "local" ? "No local debates yet in your area." : "No debates yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((d) => (
              <DebateCoverCard key={d.id} d={d} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ForYouPage;
