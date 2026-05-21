import { Link } from "react-router-dom";
import { FileText, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { gradientFromSeed } from "@/lib/gradient";
import type { ExploreDebate } from "@/hooks/useExplore";

interface Props {
  d: ExploreDebate;
}

const CompactRecordCard = ({ d }: Props) => {
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

  return (
    <Link
      to={to}
      className="group block w-[148px] sm:w-[168px] shrink-0"
    >
      <div
        className="relative w-full aspect-[4/5] rounded-lg overflow-hidden border border-border transition-colors group-hover:border-foreground/30"
        style={bg}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        {(isLive || isImported) && (
          <div className="absolute top-2 left-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-body font-medium uppercase tracking-wider border border-border bg-background/95 text-foreground",
              )}
            >
              {isLive ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                  Live
                </>
              ) : (
                <>
                  <FileText className="w-2.5 h-2.5" />
                  Imported
                </>
              )}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <h4 className="font-body text-[13px] leading-snug text-foreground line-clamp-2">
          {d.topic}
        </h4>
        <div className="text-[11px] text-muted-foreground font-body truncate mt-0.5">
          {d.publisher_name || (isImported ? "Imported" : "Anonymous")}
        </div>
      </div>
    </Link>
  );
};

export default CompactRecordCard;