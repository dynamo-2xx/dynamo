import { useState, useEffect } from "react";
import { Clock, Lock } from "lucide-react";

interface EditWindowBannerProps {
  editWindowEndsAt: string;
  isParticipant: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${minutes}m ${seconds}s`;
}

const EditWindowBanner = ({ editWindowEndsAt, isParticipant }: EditWindowBannerProps) => {
  const [remaining, setRemaining] = useState(() => new Date(editWindowEndsAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(editWindowEndsAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [editWindowEndsAt]);

  const isExpired = remaining <= 0;

  if (isExpired) {
    return (
      <div className="border-b border-border bg-muted/50 px-6 py-3 flex items-center gap-3">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          The edit window has closed. This debate record is now <span className="font-semibold text-foreground">permanently finalized</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Clock className="w-4 h-4 text-primary" />
        <p className="text-sm text-foreground">
          {isParticipant
            ? "You can edit your arguments before the record is finalized."
            : "Participants can edit their arguments during this window."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Closes in</span>
        <span className="text-sm font-display font-bold text-primary tabular-nums">
          {formatCountdown(remaining)}
        </span>
      </div>
    </div>
  );
};

export default EditWindowBanner;
