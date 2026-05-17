import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  retry?: () => void;
  className?: string;
}

export const ErrorState = ({
  message = "Something went wrong loading this.",
  retry,
  className = "",
}: ErrorStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-8 px-4 ${className}`}
    >
      <AlertCircle className="w-5 h-5 text-muted-foreground mb-2" strokeWidth={1.5} />
      <p className="font-body text-sm text-muted-foreground mb-3">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="text-xs font-body underline text-foreground hover:opacity-70 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default ErrorState;