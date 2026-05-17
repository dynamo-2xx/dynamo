import { Link } from "react-router-dom";

interface ErrorPageProps {
  eventId?: string;
  onRetry?: () => void;
}

const ErrorPage = ({ eventId, onRetry }: ErrorPageProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-sm tracking-[0.2em] text-muted-foreground uppercase mb-6">
          DYNAMO
        </p>
        <h1 className="font-display text-5xl mb-3 text-foreground">
          Something broke on our end.
        </h1>
        <p className="font-body text-muted-foreground mb-8">
          We've been notified. Try again, or head home.
        </p>
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-body hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Go home
          </Link>
          {eventId && (
            <p className="mt-6 text-[10px] font-mono text-muted-foreground/60">
              ref: {eventId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;