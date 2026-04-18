import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconCircleButtonProps {
  onClick?: () => void;
  active?: boolean;
  pulse?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Small 28x28 circular button used for the metadata-row stack
 * (d. narration toggle, argument map toggle, notebook toggle).
 * Shares hover, focus, and pulse styling so the three siblings look uniform.
 */
const IconCircleButton = forwardRef<HTMLButtonElement, IconCircleButtonProps>(
  ({ onClick, active, pulse, disabled, title, children, className, ariaLabel }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel ?? title}
        className={cn(
          "relative w-7 h-7 rounded-full flex items-center justify-center border transition-colors shrink-0",
          disabled
            ? "bg-muted/40 text-muted-foreground border-border opacity-50 cursor-not-allowed"
            : active
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
          className,
        )}
      >
        {pulse && !disabled && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping pointer-events-none" />
        )}
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </button>
    );
  },
);

IconCircleButton.displayName = "IconCircleButton";

export default IconCircleButton;
