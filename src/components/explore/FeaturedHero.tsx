import { Link } from "react-router-dom";
import { Users, FileText } from "lucide-react";
import { gradientFromSeed } from "@/lib/gradient";
import type { ExploreDebate } from "@/hooks/useExplore";

interface Props {
  d: ExploreDebate;
}

const FeaturedHero = ({ d }: Props) => {
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
      ? "Featured Import"
      : isScheduled
        ? "Coming Up"
        : "Featured";

  return (
    <Link
      to={to}
      className="relative block w-full rounded-2xl overflow-hidden border border-border h-[280px] sm:h-[340px] md:h-[400px] group"
      style={bg}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-body font-medium uppercase tracking-wider border border-white/30 bg-black/40 text-white backdrop-blur-sm">
          {isLive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
          )}
          {isImported && <FileText className="w-3 h-3" />}
          {label}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
        <h2 className="font-display text-white text-2xl sm:text-3xl md:text-4xl leading-tight line-clamp-3 max-w-3xl drop-shadow">
          {d.topic}
        </h2>
        <div className="mt-2 flex items-center gap-3 text-[12px] text-white/80 font-body">
          {d.publisher_name && <span>{d.publisher_name}</span>}
          {typeof d.participant_count === "number" && d.participant_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {d.participant_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default FeaturedHero;