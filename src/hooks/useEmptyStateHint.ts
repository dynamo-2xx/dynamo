import { useEffect, useRef, useState } from "react";

/**
 * Empty-state hint visibility.
 * - Desktop (hover: hover): active while pointer is over the element.
 * - Touch/mobile: active for 3s when element enters viewport. Re-triggers on viewport re-entry only.
 */
export function useEmptyStateHint<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const canHover =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(hover: hover)").matches;

    if (canHover) {
      const onEnter = () => setActive(true);
      const onLeave = () => setActive(false);
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      };
    }

    // Touch path: 3s on entry, only re-trigger on viewport re-entry.
    let timer: number | undefined;
    let wasIntersecting = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !wasIntersecting) {
            wasIntersecting = true;
            setActive(true);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setActive(false), 3000);
          } else if (!entry.isIntersecting) {
            wasIntersecting = false;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return { ref, active };
}
