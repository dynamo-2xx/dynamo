import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useMyStudy, isNotebookNonEmpty, notebookTitle, notebookPreview } from "@/hooks/useMyStudy";
import { useEdgeScroll } from "@/hooks/useEdgeScroll";
import EdgeArrow from "@/components/explore/EdgeArrow";
import { monoGradientFromSeed } from "@/lib/gradient";

const HomeMyStudyRow = () => {
  const { notebooks, loading } = useMyStudy();
  const items = notebooks
    .filter((n) => !n.deleted_at && isNotebookNonEmpty(n))
    .slice(0, 6);
  const { ref, canLeft, canRight, scrollByCard } = useEdgeScroll<HTMLDivElement>();

  if (loading) return null;

  return (
    <section className="mb-8 md:mb-10">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display text-lg md:text-xl truncate">My Study</h3>
          <span className="hidden sm:inline text-[11px] text-muted-foreground font-body">
            Pick up where you left off.
          </span>
        </div>
        <Link
          to="/my-study"
          aria-label="Open My Study"
          className="shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-5 text-center">
          <p className="text-xs text-muted-foreground font-body mb-2">
            Start a notebook from any session record.
          </p>
          <Link
            to="/my-debates"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors"
          >
            Browse my sessions
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={ref}
            className="flex gap-3 overflow-x-auto pb-2 -mx-3 sm:-mx-1 px-3 sm:px-1 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((n) => {
              const preview = notebookPreview(n);
              const title = notebookTitle(n);
              return (
                <Link
                  key={n.id}
                  to={`/my-study/${n.id}`}
                  className="snap-start shrink-0 w-[170px] sm:w-[180px] group"
                >
                  {/* Book cover */}
                  <div
                    className="relative aspect-[3/4] rounded-lg border border-border overflow-hidden shadow-sm group-hover:shadow-md transition-shadow"
                    style={{ backgroundImage: monoGradientFromSeed(n.id || title) }}
                  >
                    <span
                      className={`absolute top-2 right-2 z-10 text-[10px] px-1.5 py-0.5 rounded-full font-body ${
                        n.published
                          ? "bg-foreground text-background"
                          : "bg-background/80 backdrop-blur border border-border text-muted-foreground"
                      }`}
                    >
                      {n.published ? "Published" : "Draft"}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/55 via-black/20 to-transparent">
                      <h4 className="font-display text-[15px] leading-tight text-white line-clamp-3">
                        {title}
                      </h4>
                    </div>
                  </div>
                  {/* Below cover: My Thoughts preview */}
                  <div className="mt-2 px-0.5">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-body mb-0.5">
                      My Thoughts
                    </p>
                    <p
                      className={`text-[11px] font-body line-clamp-2 ${
                        preview ? "text-foreground/80" : "italic text-muted-foreground"
                      }`}
                    >
                      {preview || "No content yet"}
                    </p>
                    {(n.session_created_at || n.annotation_count > 0) && (
                      <p className="text-[10px] text-muted-foreground font-body mt-1 truncate">
                        {n.session_created_at
                          ? new Date(n.session_created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                        {n.annotation_count > 0 && <> · {n.annotation_count} annotations</>}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <EdgeArrow side="left" visible={canLeft} onClick={() => scrollByCard(-1)} />
          <EdgeArrow side="right" visible={canRight} onClick={() => scrollByCard(1)} />
        </div>
      )}
    </section>
  );
};

export default HomeMyStudyRow;