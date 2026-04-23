import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useMyStudy, isNotebookNonEmpty, notebookTitle, notebookPreview } from "@/hooks/useMyStudy";

const HomeMyStudyRow = () => {
  const { notebooks, loading } = useMyStudy();
  const items = notebooks
    .filter((n) => !n.deleted_at && isNotebookNonEmpty(n))
    .slice(0, 6);

  if (loading) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display text-lg truncate">My Study</h3>
          <span className="text-[11px] text-muted-foreground font-body">Pick up where you left off.</span>
        </div>
        <Link
          to="/my-study"
          aria-label="Open My Study"
          className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
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
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {items.map((n) => {
            const preview = notebookPreview(n);
            return (
              <Link
                key={n.id}
                to={`/my-study/${n.id}`}
                className="snap-start shrink-0 w-64 border border-border rounded-lg p-3 hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-display text-sm truncate">{notebookTitle(n)}</h4>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-body ${
                      n.published
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {n.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-body mb-1">
                  {n.session_created_at
                    ? new Date(n.session_created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                  {n.annotation_count > 0 && <> · {n.annotation_count} annotations</>}
                </p>
                <p
                  className={`text-xs font-body line-clamp-3 ${
                    preview ? "text-foreground/80" : "italic text-muted-foreground"
                  }`}
                >
                  {preview || "No content yet"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default HomeMyStudyRow;