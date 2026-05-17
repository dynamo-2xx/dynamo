import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  const mailto = `mailto:hello@dynamo.today?subject=Broken%20link&body=${encodeURIComponent(
    `Route: ${location.pathname}`
  )}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-sm tracking-[0.2em] text-muted-foreground uppercase mb-6">
          DYNAMO
        </p>
        <h1 className="font-display text-5xl mb-3 text-foreground">Page not found</h1>
        <p className="font-body text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="flex flex-col gap-2 items-center">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-body hover:opacity-90 transition-opacity"
          >
            Go home
          </Link>
          <a
            href={mailto}
            className="px-5 py-2.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Report this
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
