import { Link } from "react-router-dom";
import { Pin, PinOff } from "lucide-react";
import { gradientFromSeed } from "@/lib/gradient";
import { cn } from "@/lib/utils";
import type { ClubRecord } from "@/hooks/useClubExplore";

interface Props {
  r: ClubRecord;
  pinned?: boolean;
  canPin?: boolean;
  onTogglePin?: () => void;
}

function hrefFor(r: ClubRecord): string {
  switch (r.kind) {
    case "cmm":
      return `/cmm/${r.id}`;
    case "live":
      return `/live/${r.id}`;
    case "imported_record":
      return `/import/${r.id}`;
    default:
      return r.status === "scheduled" || r.status === "draft"
        ? `/debate/${r.id}/preview`
        : `/debate/${r.id}`;
  }
}

const KIND_LABEL: Record<ClubRecord["kind"], string> = {
  debate: "Debate",
  cmm: "CMM",
  live: "Live",
  imported_record: "Imported",
};

const ClubRecordCard = ({ r, pinned, canPin, onTogglePin }: Props) => {
  const bg = r.cover_image_url
    ? {
        backgroundImage: `url(${r.cover_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundImage: gradientFromSeed(r.title) };

  const isLive = r.status === "live";

  return (
    <div className="group relative w-[148px] sm:w-[168px] shrink-0">
      <Link to={hrefFor(r)} className="block">
        <div
          className="relative w-full aspect-[4/5] rounded-lg overflow-hidden border border-border transition-colors group-hover:border-foreground/30"
          style={bg}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-body font-medium uppercase tracking-wider border border-border bg-background/95 text-foreground">
              {isLive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
              )}
              {isLive ? "Live" : KIND_LABEL[r.kind]}
            </span>
          </div>
        </div>
        <div className="mt-1.5 px-0.5">
          <h4 className="font-body text-[13px] leading-snug text-foreground line-clamp-2">
            {r.title}
          </h4>
          {r.starts_at && (
            <div className="text-[11px] text-muted-foreground font-body truncate mt-0.5">
              {new Date(r.starts_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      </Link>
      {canPin && (
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? "Unpin" : "Pin to featured"}
          className={cn(
            "absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border border-border backdrop-blur transition-colors",
            pinned ? "bg-foreground text-background" : "bg-background/85 text-foreground hover:bg-background",
          )}
        >
          {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
};

export default ClubRecordCard;