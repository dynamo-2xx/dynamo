import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebateTimerProps {
  timeLeft: number;
  size?: "sm" | "md" | "lg" | "xl";
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const DebateTimer = ({ timeLeft, size = "md" }: DebateTimerProps) => {
  const isPulsing = timeLeft <= 10 && timeLeft > 0;

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-5xl",
    xl: "text-7xl",
  };

  return (
    <div className="flex items-center gap-2">
      {size !== "xl" && size !== "lg" && (
        <Clock className="w-4 h-4 text-primary" />
      )}
      <span
        className={cn(
          "font-display font-bold tabular-nums text-primary transition-opacity",
          sizeClasses[size],
          isPulsing && "animate-pulse"
        )}
      >
        {formatTime(timeLeft)}
      </span>
    </div>
  );
};

export default DebateTimer;
