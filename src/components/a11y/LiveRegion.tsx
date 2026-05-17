import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

/**
 * §7 Accessibility — Global ARIA live region. Mount once in App. Components
 * call `announce("Turn ended")` to push screen-reader-only messages.
 */
interface Ctx {
  announce: (msg: string, opts?: { assertive?: boolean }) => void;
}

const LiveRegionContext = createContext<Ctx>({ announce: () => {} });

export const useAnnounce = () => useContext(LiveRegionContext).announce;

export const LiveRegionProvider = ({ children }: { children: ReactNode }) => {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const timer = useRef<number | null>(null);

  const announce = useCallback((msg: string, opts?: { assertive?: boolean }) => {
    if (opts?.assertive) setAssertive(msg);
    else setPolite(msg);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setPolite("");
      setAssertive("");
    }, 3000);
  }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{polite}</div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">{assertive}</div>
    </LiveRegionContext.Provider>
  );
};