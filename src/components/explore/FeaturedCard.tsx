import { Link } from "react-router-dom";
import { Users, FileText, MessageCircle } from "lucide-react";
import { gradientFromSeed } from "@/lib/gradient";
import type { ExploreDebate } from "@/hooks/useExplore";

interface Props {
  d: ExploreDebate & { comment_count?: number };
}

const FeaturedCard = ({ d }: Props) => {
  const isImported = d.kind === "imported_record";
  const isLive = d.status === "live";
  const isScheduled = d.status === "scheduled" || d.status === "draft";

  const to = isImported
    ? `/import/${d.id}`
    : isScheduled
      ? `/debate/${d.id}/preview`
      : `/debate/${d.id}`;

  const bg = d.cover_image_url
    ? {
        backgroundImage: `url(${d.cover_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundImage: gradientFromSeed(d.topic) };

  const label = isLive
    ? "Live Now"
    : isImported
      ? "Imported"
      : isScheduled
        ? "Coming Up"
        : "Featured";

  return (
    <Link
      to={to}
      data-featured-card
      className="snap-start shrink-0 w-[78vw] sm:w-[44vw] md:w-[calc((100%-1.5rem)/3)] group"
    >
      <div
        className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-border transition-colors group-hover:border-foreground/30"
        style={bg}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider border border-white/25 bg-black/40 text-white backdrop-blur-sm">
            {isLive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            )}
            {isImported && <FileText className="w-2.5 h-2.5" />}
            {label}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 min-w-0">
          <h3 className="font-display text-white text-base sm:text-lg md:text-xl leading-tight line-clamp-3 drop-shadow break-words [overflow-wrap:anywhere] hyphens-auto">
            {d.topic}
          </h3>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/80 font-body">
            {d.publisher_name && (
              <span className="truncate max-w-[60%]">{d.publisher_name}</span>
            )}
            {typeof d.participant_count === "number" && d.participant_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {d.participant_count}
              </span>
            )}
            {typeof d.comment_count === "number" && d.comment_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {d.comment_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default FeaturedCard;