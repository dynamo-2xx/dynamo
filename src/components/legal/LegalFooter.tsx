import { Link } from "react-router-dom";

const LegalFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border mt-12 py-6 px-4">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-body text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/guidelines" className="hover:text-foreground transition-colors">Guidelines</Link>
          <Link to="/legal/subprocessors" className="hover:text-foreground transition-colors">Subprocessors</Link>
        </div>
        <div>© {year} Dynamo</div>
      </div>
    </footer>
  );
};

export default LegalFooter;