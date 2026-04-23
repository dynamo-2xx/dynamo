import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SharedNotebook {
  id: string;
  session_id: string;
  display_title: string | null;
  thoughts: any;
  my_take: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
  session_title: string | null;
  session_created_at: string | null;
}

const SharedNotebookPage = () => {
  const { token } = useParams<{ token: string }>();
  const [nb, setNb] = useState<SharedNotebook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await (supabase.rpc as any)("get_shared_notebook", { _token: token });
      const row = (data && data[0]) || null;
      setNb(row);
      setLoading(false);
    })();
  }, [token]);

  const title = nb?.display_title || nb?.session_title || "Untitled session";
  const thoughts = ((nb?.thoughts as any)?.blocks?.[0]?.value || "").trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dynamo
        </Link>

        {loading ? (
          <div className="space-y-3">
            <div className="h-6 bg-accent rounded animate-pulse w-2/3" />
            <div className="h-4 bg-accent rounded animate-pulse w-1/3" />
          </div>
        ) : !nb ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center">
            <h1 className="font-display text-xl mb-1">Notebook not found</h1>
            <p className="text-sm text-muted-foreground font-body">
              The link may have been revoked or never existed.
            </p>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <header>
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <BookOpen className="w-3 h-3" /> Shared notebook
              </div>
              <h1 className="font-display text-3xl sm:text-4xl mb-2">{title}</h1>
              {nb.session_created_at && (
                <p className="text-xs text-muted-foreground font-body">
                  Recorded{" "}
                  {new Date(nb.session_created_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </header>

            {nb.my_take && (
              <section>
                <h2 className="font-display text-lg mb-2">My Take</h2>
                <p className="text-sm text-foreground/90 font-body whitespace-pre-wrap leading-relaxed">
                  {nb.my_take}
                </p>
              </section>
            )}

            {thoughts && (
              <section>
                <h2 className="font-display text-lg mb-2">Thoughts</h2>
                <p className="text-sm text-foreground/85 font-body whitespace-pre-wrap leading-relaxed">
                  {thoughts}
                </p>
              </section>
            )}

            {!nb.my_take && !thoughts && (
              <p className="text-sm italic text-muted-foreground">This notebook is empty.</p>
            )}
          </motion.article>
        )}
      </div>
    </div>
  );
};

export default SharedNotebookPage;