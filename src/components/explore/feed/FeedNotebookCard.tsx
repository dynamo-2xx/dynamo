import { Link } from "react-router-dom";
import { monoGradientFromSeed } from "@/lib/gradient";
import type { FeedNotebook } from "@/hooks/useFeed";

interface Props {
  notebook: FeedNotebook;
}

function titleOf(n: FeedNotebook): string {
  if (n.display_title?.trim()) return n.display_title;
  const t = n.thoughts as any;
  const blocks = t?.blocks as any[] | undefined;
  const first = blocks?.find((b) => typeof b?.text === "string" && b.text.trim());
  if (first) return String(first.text).slice(0, 120);
  if (n.my_take) return n.my_take.slice(0, 120);
  return "Untitled notebook";
}

function recordHref(n: FeedNotebook): string {
  switch (n.record_type) {
    case "debate":
      return `/debate/${n.record_id}`;
    case "change_my_mind":
      return `/cmm/${n.record_id}`;
    case "imported_record":
      return `/import/${n.record_id}`;
    default:
      return `/live/${n.record_id}`;
  }
}

function recordLabel(n: FeedNotebook): string {
  switch (n.record_type) {
    case "debate":
      return "Debate";
    case "change_my_mind":
      return "CMM";
    case "imported_record":
      return "Imported";
    default:
      return "Live";
  }
}

const FeedNotebookCard = ({ notebook }: Props) => {
  const title = titleOf(notebook);
  const initials = (notebook.author_name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const date = new Date(notebook.published_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const to = notebook.share_token
    ? `/study/shared/${notebook.share_token}`
    : `/my-study/${notebook.id}`;

  return (
    <article className="border border-border rounded-xl bg-background overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 pt-3">
        <Link
          to={`/u/${notebook.user_id}`}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0"
        >
          {notebook.author_avatar ? (
            <img
              src={notebook.author_avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-body text-muted-foreground">
              {initials}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/u/${notebook.user_id}`}
            className="text-sm font-body font-medium text-foreground hover:underline truncate block"
          >
            {notebook.author_name || "Anonymous"}
          </Link>
          <span className="text-[11px] text-muted-foreground font-body">
            Published a notebook · {date}
          </span>
        </div>
      </header>

      {notebook.publish_caption && (
        <p className="px-4 pt-3 text-[14px] leading-relaxed font-body text-foreground whitespace-pre-wrap break-words">
          {notebook.publish_caption}
        </p>
      )}

      <Link to={to} className="block mt-3 group">
        <div
          className="relative aspect-[16/9] mx-4 mb-3 rounded-lg border border-border overflow-hidden group-hover:border-foreground/30 transition-colors"
          style={{ backgroundImage: monoGradientFromSeed(notebook.id) }}
        >
          <div className="absolute top-2 right-2 z-10">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-body bg-background/85 backdrop-blur border border-border text-muted-foreground">
              {recordLabel(notebook)}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
            <h4 className="font-display text-white text-lg leading-tight line-clamp-2 drop-shadow">
              {title}
            </h4>
          </div>
        </div>
      </Link>

      <footer className="px-4 pb-3 -mt-1 text-[11px] text-muted-foreground font-body flex items-center justify-between">
        <Link
          to={recordHref(notebook)}
          className="hover:text-foreground underline-offset-2 hover:underline truncate"
        >
          in response to {recordLabel(notebook).toLowerCase()}
        </Link>
        <Link
          to={to}
          className="shrink-0 ml-3 text-foreground/80 hover:text-foreground"
        >
          Read →
        </Link>
      </footer>
    </article>
  );
};

export default FeedNotebookCard;