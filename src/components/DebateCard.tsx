import { cn } from "@/lib/utils";
import { Clock, Users, MessageSquare, Shield } from "lucide-react";

interface DebateCardProps {
  topic: string;
  date: string;
  participants: number;
  arguments: number;
  community?: string;
  verified?: boolean;
  status?: "live" | "completed" | "scheduled";
}

const DebateCard = ({ topic, date, participants, arguments: argCount, community, verified, status = "completed" }: DebateCardProps) => {
  return (
    <div className="bg-background border border-border rounded-lg p-5 hover:border-foreground/20 transition-colors cursor-pointer group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display text-sm leading-snug group-hover:text-foreground transition-colors">
          {topic}
        </h3>
        {status === "live" && (
          <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-body font-medium uppercase tracking-wider bg-[#dcfce7] text-[#166534] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-[#166534] rounded-full" />
            Live
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-body">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{date}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{participants}</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{argCount} arguments</span>
      </div>
      {(community || verified) && (
        <div className="mt-3 flex items-center gap-2">
          {community && <span className="text-[10px] font-body bg-accent text-muted-foreground px-2 py-0.5 rounded-full">{community}</span>}
          {verified && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-body font-medium">
              <Shield className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DebateCard;
