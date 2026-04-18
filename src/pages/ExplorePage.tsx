import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, TrendingUp, Sparkles, Search, ChevronRight, Clock, Users, MessageSquare, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";

const featuredDebates = [
  {
    id: "featured-1",
    topic: "Should our city invest in a new light rail line?",
    description: "A heated local debate with verified council members weighing in on transit infrastructure.",
    date: "5h ago",
    participants: 8,
    arguments: 34,
    community: "Portland City Council",
    verified: true,
    status: "live" as const,
  },
  {
    id: "featured-2",
    topic: "Is AI art real art?",
    description: "Artists and technologists clash over the boundaries of creativity in the age of generative AI.",
    date: "12h ago",
    participants: 12,
    arguments: 67,
    status: "live" as const,
  },
];

const trendingDebates = [
  { id: "trending-1", topic: "Should voting be mandatory?", date: "1 day ago", participants: 6, arguments: 42 },
  { id: "trending-2", topic: "Nuclear energy: solution or risk?", date: "3 days ago", participants: 8, arguments: 55 },
  { id: "trending-3", topic: "Does social media do more harm than good for democracy?", date: "1 week ago", participants: 5, arguments: 31 },
];

const latestDebates = [
  { id: "latest-1", topic: "Park funding allocation for 2026", date: "2 days ago", participants: 5, arguments: 19, community: "Portland, OR", verified: true },
  { id: "latest-2", topic: "Should school start times be pushed to 9am?", date: "3 days ago", participants: 3, arguments: 18, community: "Education" },
  { id: "latest-3", topic: "Remote work mandates: fair or outdated?", date: "4 days ago", participants: 7, arguments: 29 },
];

const categories = [
  "Politics", "Education", "Technology", "Environment", "Health", "Economy",
];

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header */}
          <h2 className="text-2xl sm:text-3xl font-display mb-6 sm:mb-8">Explore</h2>

          {/* Search */}
          <div className="relative mb-8 sm:mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, arguments, communities..."
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-base sm:text-[13px] font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          {/* Featured – hero cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {featuredDebates.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative group cursor-pointer rounded-xl overflow-hidden border border-border bg-accent/40 hover:border-foreground/20 transition-colors"
                onClick={() => navigate(`/explore/${d.id}`)}
              >
                <div className="p-6 pb-8 flex flex-col justify-between min-h-[220px]">
                  <div>
                    {d.community && (
                      <span className="text-[10px] font-body font-medium uppercase tracking-wider text-muted-foreground">
                        {d.community}
                      </span>
                    )}
                    {!d.community && d.status === "live" && (
                      <span className="text-[10px] font-body font-medium uppercase tracking-wider text-muted-foreground">
                        LIVE DEBATE
                      </span>
                    )}
                    <h3 className="font-display text-lg mt-1 leading-snug">{d.topic}</h3>
                  </div>
                  <div className="mt-auto pt-4">
                    <p className="text-xs font-body text-muted-foreground leading-relaxed line-clamp-2">
                      {d.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      {d.status === "live" && (
                        <span className="flex items-center gap-1.5 text-[10px] font-body font-medium uppercase tracking-wider bg-[#dcfce7] text-[#166534] dark:bg-[#166534]/20 dark:text-[#4ade80] px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-[#166534] dark:bg-[#4ade80] rounded-full animate-pulse" />
                          Live
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-body flex items-center gap-1">
                        <Users className="w-3 h-3" /> {d.participants}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-body flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {d.arguments}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trending section */}
          <SectionHeader title="Trending" icon={<TrendingUp className="w-4 h-4" />} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-12">
            {trendingDebates.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <CompactCard {...d} rank={i + 1} onClick={() => navigate(`/explore/${d.id}`)} />
              </motion.div>
            ))}
          </div>

          {/* Latest section */}
          <SectionHeader title="Latest" icon={<Sparkles className="w-4 h-4" />} />
          <div className="space-y-2 mb-12">
            {latestDebates.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ListRow {...d} onClick={() => navigate(`/explore/${d.id}`)} />
              </motion.div>
            ))}
          </div>

          {/* More to Explore */}
          <SectionHeader title="More to Explore" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-background hover:border-foreground/20 transition-colors text-sm font-body font-medium text-foreground group cursor-pointer"
              >
                {cat}
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

/* ── Sub-components ── */

const SectionHeader = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-4 group cursor-pointer w-fit">
    {icon}
    <h3 className="font-display text-lg">{title}</h3>
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
  </div>
);

const CompactCard = ({
  topic,
  date,
  participants,
  arguments: argCount,
  rank,
  onClick,
}: {
  topic: string;
  date: string;
  participants: number;
  arguments: number;
  rank: number;
  onClick?: () => void;
}) => (
  <div onClick={onClick} className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors cursor-pointer bg-background group">
    <span className="text-[10px] font-body text-muted-foreground font-medium">#{rank} Trending</span>
    <h4 className="font-display text-sm mt-1 leading-snug line-clamp-2 group-hover:text-foreground transition-colors">
      {topic}
    </h4>
    <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground font-body">
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{date}</span>
      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participants}</span>
      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{argCount}</span>
    </div>
  </div>
);

const ListRow = ({
  topic,
  date,
  participants,
  arguments: argCount,
  community,
  verified,
  onClick,
}: {
  topic: string;
  date: string;
  participants: number;
  arguments: number;
  community?: string;
  verified?: boolean;
  onClick?: () => void;
}) => (
  <div onClick={onClick} className="flex items-center gap-4 border border-border rounded-xl px-5 py-4 hover:border-foreground/20 transition-colors cursor-pointer bg-background group">
    <div className="flex-1 min-w-0">
      <h4 className="font-display text-sm leading-snug truncate group-hover:text-foreground transition-colors">
        {topic}
      </h4>
      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-body">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{date}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participants}</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{argCount}</span>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {community && (
        <span className="text-[10px] font-body bg-accent text-muted-foreground px-2 py-0.5 rounded-full">{community}</span>
      )}
      {verified && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-body font-medium">
          <Shield className="w-3 h-3" /> Verified
        </span>
      )}
    </div>
  </div>
);

export default ExplorePage;
