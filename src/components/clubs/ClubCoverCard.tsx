import { Link } from "react-router-dom";
import { Users, Globe, Lock, MapPin } from "lucide-react";
import { gradientFromSeed } from "@/lib/gradient";
import { cn } from "@/lib/utils";
import type { ClubItem } from "@/hooks/useClubs";

const PILL =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider border border-border";

const ClubCoverCard = ({ c }: { c: ClubItem }) => {
  const bg = c.cover_image_url
    ? { backgroundImage: `url(${c.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: gradientFromSeed(c.name) };

  return (
    <Link
      to={`/clubs/${c.id}`}
      className="relative block w-full aspect-[16/10] rounded-xl overflow-hidden border border-border hover:border-foreground/30 transition-colors"
      style={bg as any}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute top-3 left-3">
        <span className={cn(PILL, "bg-background/95 text-foreground")}>
          {c.is_public ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
          {c.is_public ? "Public" : "Private"}
        </span>
      </div>
      {typeof c.member_count === "number" && (
        <div className="absolute top-3 right-3">
          <span className={cn(PILL, "bg-background/90 text-foreground normal-case tracking-normal")}>
            <Users className="w-3 h-3" />
            {c.member_count}
          </span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3">
        <h4 className="font-display text-white text-base leading-snug line-clamp-2 drop-shadow">{c.name}</h4>
        {c.location && (
          <div className="flex items-center gap-1 text-white/85 text-[11px] font-body mt-1">
            <MapPin className="w-3 h-3" />
            {c.location}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ClubCoverCard;