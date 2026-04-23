import { useCallback, useEffect, useRef } from "react";

interface Props {
  direction: "horizontal" | "vertical";
  /** Current split ratio (0..1) of the first pane. */
  ratio: number;
  onChange: (ratio: number) => void;
  /** Container ref used to measure available size. */
  containerRef: React.RefObject<HTMLElement>;
  min?: number;
  max?: number;
}

/**
 * Draggable divider for splitting two panes inside the notebook.
 * - direction="vertical" → side-by-side panes, divider is a vertical bar (drag horizontally).
 * - direction="horizontal" → stacked panes, divider is a horizontal bar (drag vertically).
 */
const NotebookSplitDivider = ({
  direction,
  ratio,
  onChange,
  containerRef,
  min = 0.18,
  max = 0.82,
}: Props) => {
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let r =
        direction === "vertical"
          ? (e.clientX - rect.left) / rect.width
          : (e.clientY - rect.top) / rect.height;
      r = Math.min(max, Math.max(min, r));
      onChange(r);
    },
    [containerRef, direction, max, min, onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  // Safety: clear dragging on window-level pointerup
  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  if (direction === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="group relative w-1.5 shrink-0 cursor-col-resize bg-foreground/10 hover:bg-foreground/30 transition-colors"
        style={{ touchAction: "none" }}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-foreground/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="group relative h-3 shrink-0 cursor-row-resize bg-foreground/[0.04] hover:bg-foreground/10 transition-colors flex items-center justify-center"
      style={{ touchAction: "none" }}
    >
      <div className="h-1 w-10 rounded-full bg-foreground/30 group-hover:bg-foreground/50" />
    </div>
  );
};

export default NotebookSplitDivider;