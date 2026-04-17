import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { gradientFromSeed } from "@/lib/gradient";

export interface DebateCoverItem {
  id: string;
  topic: string;
  status: string;
  cover_image_url?: string | null;
  participant_count?: number;
  created_at?: string;
}

const DebateCoverCard = ({ d }: { d: DebateCoverItem }) => {
  const isLive = d.status === "live";
  const bg = d.cover_image_url
    ? { backgroundImage: `url(${d.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: gradientFromSeed(d.topic) };

  return (
    <Link
      to={`/debate/${d.id}`}
      className="group relative block w-full aspect-[16/10] rounded-xl overflow-hidden border border-border hover:border-foreground/30 transition-colors"
      style={bg}
    >
      {/* Bottom gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Top row */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider bg-white/90 text-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wider bg-white/80 text-muted-foreground">
            {d.status}
          </span>
        )}
        {typeof d.participant_count === "number" && d.participant_count > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body bg-white/85 text-foreground">
            <Users className="w-3 h-3" />
            {d.participant_count}
          </span>
        )}
      </div>

      {/* Bottom topic */}
      <div className="absolute bottom-3 left-3 right-3">
        <h4 className="font-display text-white text-base leading-snug line-clamp-2 drop-shadow">
          {d.topic}
        </h4>
      </div>
    </Link>
  );
};

export default DebateCoverCard;
