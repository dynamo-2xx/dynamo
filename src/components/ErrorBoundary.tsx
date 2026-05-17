import { Component, ReactNode } from "react";
import ErrorPage from "@/pages/ErrorPage";

interface State {
  hasError: boolean;
  eventId?: string;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    const eventId = Math.random().toString(36).slice(2, 10);
    return { hasError: true, eventId };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Sentry not wired yet (§10) — log to console so it surfaces during dev.
    console.error("[ErrorBoundary]", error, info);
    // Forward to global handler (Sentry hook point)
    try {
      (window as any).__dynamoReportError?.(error, { fatal: true, info });
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, eventId: undefined });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorPage eventId={this.state.eventId} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}