import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Hash } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import type { ExploreDebate } from "@/hooks/useExplore";
import type { Tag } from "@/hooks/useTags";
import { fetchTagShelf } from "@/hooks/useTagShelves";
import FloatingSearch from "@/components/explore/FloatingSearch";
import CompactRecordCard from "@/components/explore/CompactRecordCard";

const TopicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tag, setTag] = useState<Tag | null>(null);
  const [subtags, setSubtags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ExploreDebate[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("tags").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      const t = data as Tag | null;
      setTag(t);
      if (t?.id) {
        const { data: kids } = await (supabase as any)
          .from("tags")
          .select("*")
          .eq("parent_tag_id", t.id)
          .order("debate_count", { ascending: false });
        if (!cancelled) setSubtags((kids || []) as Tag[]);
        const records = await fetchTagShelf(t, 200);
        if (!cancelled) setItems(records);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? items.filter((i) => i.topic.toLowerCase().includes(q)) : items),
    [items, q],
  );

  return (
    <AppLayout>
      <FloatingSearch value={search} onChange={setSearch} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
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
              <span className="text-[12px] text-muted-foreground font-body ml-1">
                {items.length} record{items.length === 1 ? "" : "s"}
              </span>
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

            {filtered.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl px-5 py-12 text-center text-sm text-muted-foreground font-body">
                {q
                  ? `No records match “${search}” in #${tag.name}.`
                  : `Nothing here yet — start a debate and tag it #${tag.name} to seed this topic.`}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-5">
                {filtered.map((d) => (
                  <CompactRecordCard key={`${d.kind}-${d.id}`} d={d} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default TopicPage;
