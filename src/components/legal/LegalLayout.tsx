import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 font-body"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="font-display text-3xl mb-2">{title}</h1>
      <p className="text-xs text-muted-foreground font-body mb-6">Last updated: {lastUpdated}</p>

      <div className="flex items-start gap-2 border border-border rounded-lg p-3 mb-8 bg-secondary/30">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
        <p className="text-xs font-body text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Template — not legal advice.</span>{" "}
          This document is a working draft. Have it reviewed by an attorney before commercial launch.
        </p>
      </div>

      <div className="space-y-6 font-body text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  );
};

export default LegalLayout;