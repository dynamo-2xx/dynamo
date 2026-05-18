import { AlertCircle, RotateCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  retry?: () => void;
  className?: string;
}

/**
 * §13 standard inline error surface. Used by data-fetching hooks/cards
 * so failed list/record loads never blank-screen.
 */
export function ErrorState({
  message = "Couldn't load this. Check your connection and try again.",
  retry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-6 py-10 text-center ${className}`}
    >
      <AlertCircle className="h-5 w-5 text-muted-foreground" />
      <p className="font-body text-sm text-muted-foreground max-w-xs">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-3.5 py-1.5 text-xs font-body text-foreground hover:bg-foreground hover:text-background transition-colors"
        >
          <RotateCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;