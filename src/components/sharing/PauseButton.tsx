import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePauseControl } from "@/hooks/usePauseControl";

interface Props {
  kind: "debate" | "live";
  id: string | null | undefined;
  isHost: boolean;
  className?: string;
  size?: "sm" | "default";
}

const formatElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Host-only pause/resume button rendered in Debate, CMM, and Live rooms.
 * When not host, shows a read-only "Paused" badge for participants.
 */
const PauseButton = ({ kind, id, isHost, className, size = "sm" }: Props) => {
  const { isPaused, elapsedMs, pause, resume } = usePauseControl({ kind, id, isHost });

  if (!isHost) {
    return isPaused ? (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium ${className || ""}`}>
        <Pause className="w-3 h-3" /> Paused by host {formatElapsed(elapsedMs)}
      </div>
    ) : null;
  }

  return (
    <Button
      variant={isPaused ? "default" : "outline"}
      size={size}
      onClick={isPaused ? resume : pause}
      className={`gap-1.5 ${isPaused ? "bg-amber-500 hover:bg-amber-600 text-white" : ""} ${className || ""}`}
    >
      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
      {isPaused ? `Resume (${formatElapsed(elapsedMs)})` : "Pause"}
    </Button>
  );
};

export default PauseButton;