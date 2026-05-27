import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Take } from "@/hooks/useTakes";

interface Props {
  take: Take;
}

const TakeCard = ({ take }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(take.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
  const initials = (take.author_name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article className="border border-border rounded-xl px-4 py-3 bg-background">
      <header className="flex items-center gap-2.5 mb-2">
        <Link
          to={`/u/${take.author_id}`}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0"
        >
          {take.author_avatar ? (
            <img src={take.author_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-body text-muted-foreground">{initials}</span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/u/${take.author_id}`}
            className="text-sm font-body font-medium text-foreground hover:underline truncate block"
          >
            {take.author_name || "Anonymous"}
          </Link>
          <span className="text-[11px] text-muted-foreground font-body">{date}</span>
        </div>
      </header>
      <p
        className={cn(
          "text-[15px] leading-relaxed font-body text-foreground whitespace-pre-wrap break-words",
          !expanded && "line-clamp-4",
        )}
      >
        {take.body}
      </p>
      {take.body.length > 240 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[12px] text-muted-foreground hover:text-foreground font-body underline-offset-2 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      <footer className="mt-3 flex items-center gap-5 text-[12px] text-muted-foreground font-body">
        <button className="inline-flex items-center gap-1.5 hover:text-foreground" aria-label="Like">
          <Heart className="w-3.5 h-3.5" />
          {take.like_count > 0 && <span>{take.like_count}</span>}
        </button>
        <button className="inline-flex items-center gap-1.5 hover:text-foreground" aria-label="Comment">
          <MessageCircle className="w-3.5 h-3.5" />
          {take.comment_count > 0 && <span>{take.comment_count}</span>}
        </button>
        <button className="inline-flex items-center gap-1.5 hover:text-foreground" aria-label="Share">
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </footer>
    </article>
  );
};

export default TakeCard;