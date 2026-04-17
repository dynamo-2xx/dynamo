import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useMyRecentDebates } from "@/hooks/useHomeDebates";
import DebateCoverCard from "@/components/home/DebateCoverCard";
import AppLayout from "@/components/AppLayout";

const MyRecentPage = () => {
  const { items, loading } = useMyRecentDebates(60);

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

        <h1 className="text-[24px] font-display mb-5">My Recent</h1>

        {loading ? (
          <p className="text-muted-foreground text-sm font-body">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm font-body py-12 text-center">
            You haven't joined or created any debates yet.
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

export default MyRecentPage;
