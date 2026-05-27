import { Pause, Play, Plus, SkipForward, ChevronRight, Sliders } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePauseControl } from "@/hooks/usePauseControl";
import { cn } from "@/lib/utils";

interface Props {
  debateId: string;
  isHost: boolean;
  timerRunning: boolean;
  onSetTimerRunning: (running: boolean) => void;
  onExtendTime: () => void;
  onSkipTurn: () => void;
  onNextSubtopic: () => void;
}

const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Header-mounted facilitator controls for the debate room. Collapses Pause Room
 * (true room-wide pause that halts the turn timer), Extend, Skip Turn, and
 * Next Subtopic inside a single "Facilitation" popover so the header stays
 * compact — especially on mobile.
 *
 * For non-hosts, shows a read-only "Paused by host" badge when the room is paused.
 */
const FacilitationMenu = ({
  debateId,
  isHost,
  timerRunning,
  onSetTimerRunning,
  onExtendTime,
  onSkipTurn,
  onNextSubtopic,
}: Props) => {
  const { isPaused, elapsedMs, pause, resume } = usePauseControl({
    kind: "debate",
    id: debateId,
    isHost,
  });

  // Read-only badge for participants when the host has paused the room.
  if (!isHost) {
    return isPaused ? (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium">
        <Pause className="w-3 h-3" /> Paused by host · {formatElapsed(elapsedMs)}
      </div>
    ) : null;
  }

  const handlePauseToggle = async () => {
    if (isPaused) {
      await resume();
      // Restart the local turn clock — turn was frozen while room was paused.
      onSetTimerRunning(true);
    } else {
      // Freeze the turn clock first so participants don't tick down a frame
      // before the realtime update lands.
      onSetTimerRunning(false);
      await pause();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            isPaused
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          )}
          aria-label="Facilitator controls"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Facilitation</span>
          {isPaused && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="tabular-nums">{formatElapsed(elapsedMs)}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        <button
          onClick={handlePauseToggle}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
            isPaused
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              : "hover:bg-secondary",
          )}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span className="flex-1 text-left">
            {isPaused ? "Resume room" : "Pause room"}
          </span>
          {isPaused && (
            <span className="tabular-nums text-[10px] opacity-80">{formatElapsed(elapsedMs)}</span>
          )}
        </button>
        <div className="my-1 h-px bg-border" />
        <button
          onClick={onExtendTime}
          disabled={isPaused}
          className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" /> Extend time (+1 min)
        </button>
        <button
          onClick={onSkipTurn}
          disabled={isPaused}
          className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip turn
        </button>
        <button
          onClick={onNextSubtopic}
          disabled={isPaused}
          className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-3.5 h-3.5" /> Next subtopic
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default FacilitationMenu;