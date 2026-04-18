import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, Radio, MessageSquare } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDebatesByTag, useLiveSessionsByTag } from "@/hooks/useExplore";
import type { Tag } from "@/hooks/useTags";

type Filter = "all" | "debates" | "live" | "live_now";

const TopicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tag, setTag] = useState<Tag | null>(null);
  const [subtags, setSubtags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("tags").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      setTag(data as Tag | null);
      if (data?.id) {
        const { data: kids } = await (supabase as any)
          .from("tags")
          .select("*")
          .eq("parent_tag_id", data.id)
          .order("debate_count", { ascending: false });
        if (!cancelled) setSubtags((kids || []) as Tag[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const { items: debates } = useDebatesByTag(tag?.id || null);
  const { items: liveSessions } = useLiveSessionsByTag(tag?.id || null);

  const liveNow = useMemo(() => debates.filter((d) => d.status === "live"), [debates]);

  const counts = {
    all: debates.length + liveSessions.length,
    debates: debates.length,
    live: liveSessions.length,
    live_now: liveNow.length,
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate("/explore")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Explore
        </button>

        {loading ? (
          <div className="animate-pulse h-12 w-48 bg-accent rounded" />
        ) : !tag ? (
          <div className="text-center py-20 text-muted-foreground font-body">Topic not found.</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-baseline gap-3 mb-1">
              <Hash className="w-6 h-6 text-muted-foreground" />
              <h1 className="text-3xl font-display">{tag.name}</h1>
              {tag.is_official && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Official</span>
              )}
            </div>
            {tag.description && (
              <p className="text-sm text-muted-foreground font-body mb-6">{tag.description}</p>
            )}

            {subtags.length > 0 && (
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body mb-2">Subtopics</p>
                <div className="flex flex-wrap gap-2">
                  {subtags.map((st) => (
                    <Link
                      key={st.id}
                      to={`/explore/topic/${st.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-foreground text-xs font-body hover:bg-foreground hover:text-background transition-colors"
                    >
                      <Hash className="w-3 h-3" />
                      {st.name}
                      <span className="text-[10px] opacity-70">{st.debate_count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Filter chips */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {([
                ["all", "All", counts.all],
                ["debates", "Debates", counts.debates],
                ["live", "Live records", counts.live],
                ["live_now", "Live now", counts.live_now],
              ] as [Filter, string, number][]).map(([k, label, n]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-body transition-colors border ${
                    filter === k
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/20"
                  }`}
                >
                  {label} <span className="opacity-70">{n}</span>
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="space-y-2">
              {(filter === "all" || filter === "live_now") &&
                liveNow.map((d) => (
                  <Link
                    key={`live-${d.id}`}
                    to={`/debate/${d.id}`}
                    className="flex items-center gap-3 border border-border rounded-xl px-5 py-4 hover:border-foreground/20 transition-colors bg-background"
                  >
                    <span className="flex items-center gap-1.5 text-[10px] font-body font-medium uppercase tracking-wider bg-[#dcfce7] text-[#166534] dark:bg-[#166534]/20 dark:text-[#4ade80] px-2 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 bg-[#166534] dark:bg-[#4ade80] rounded-full animate-pulse" />
                      Live
                    </span>
                    <span className="font-display text-sm truncate">{d.topic}</span>
                  </Link>
                ))}

              {(filter === "all" || filter === "debates") &&
                debates
                  .filter((d) => filter !== "all" || d.status !== "live")
                  .map((d) => (
                    <Link
                      key={d.id}
                      to={`/debate/${d.id}`}
                      className="flex items-center gap-3 border border-border rounded-xl px-5 py-4 hover:border-foreground/20 transition-colors bg-background"
                    >
                      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm truncate">{d.topic}</p>
                        <p className="text-[11px] text-muted-foreground font-body">
                          {new Date(d.created_at).toLocaleDateString()} · {d.participant_count} speakers
                        </p>
                      </div>
                    </Link>
                  ))}

              {(filter === "all" || filter === "live") &&
                liveSessions.map((s) => (
                  <Link
                    key={s.id}
                    to={`/live/shared/${s.share_token}`}
                    className="flex items-center gap-3 border border-border rounded-xl px-5 py-4 hover:border-foreground/20 transition-colors bg-background"
                  >
                    <Radio className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm truncate">{s.title || "Untitled session"}</p>
                      <p className="text-[11px] text-muted-foreground font-body">
                        Live record · {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}

              {counts.all === 0 && (
                <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
                  Nothing here yet — start a debate and tag it #{tag.name} to seed this topic.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default TopicPage;
