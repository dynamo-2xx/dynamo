import { useEffect, useMemo, useRef, useState } from "react";

/**
 * §6 Performance — Minimal windowing component. Renders only the rows in the
 * visible viewport plus a small overscan. Use for Explore feeds (>50 items)
 * and any long transcript view. Items must have a stable, fixed height.
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyFn?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items, itemHeight, height, overscan = 4,
  className, renderItem, keyFn,
}: VirtualListProps<T>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const { start, end, padTop, padBottom } = useMemo(() => {
    const total = items.length * itemHeight;
    const s = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
    const e = Math.min(items.length, s + visibleCount);
    return { start: s, end: e, padTop: s * itemHeight, padBottom: total - e * itemHeight };
  }, [items.length, itemHeight, height, scrollTop, overscan]);

  return (
    <div ref={ref} className={className} style={{ height, overflowY: "auto" }}>
      <div style={{ height: padTop }} />
      {items.slice(start, end).map((item, i) => (
        <div key={keyFn ? keyFn(item, start + i) : start + i} style={{ height: itemHeight }}>
          {renderItem(item, start + i)}
        </div>
      ))}
      <div style={{ height: Math.max(0, padBottom) }} />
    </div>
  );
}

export default VirtualList;