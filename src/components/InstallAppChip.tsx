import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * §7 PWA — Install chip. Listens for `beforeinstallprompt` (Chrome/Edge/Android)
 * and surfaces a discreet bottom-left chip. Hidden if already installed or if
 * the user has dismissed it this session.
 */
const DISMISS_KEY = "dynamo:install-chip-dismissed";

const InstallAppChip = () => {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    // Already installed?
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt as any);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt as any);
  }, []);

  if (!visible || !deferred) return null;

  const install = async () => {
    try {
      deferred.prompt();
      await deferred.userChoice;
    } catch {}
    setVisible(false);
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-full border border-foreground/15 bg-background/95 backdrop-blur px-3 py-1.5 shadow-sm">
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 text-[12px] font-body text-foreground"
      >
        <Download className="w-3.5 h-3.5" />
        Install Dynamo
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="ml-1 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default InstallAppChip;