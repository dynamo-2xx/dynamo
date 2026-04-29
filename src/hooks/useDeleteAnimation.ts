import { useCallback, useRef, useState } from "react";

/**
 * Tracks IDs of items that are visually animating out before being removed
 * from the underlying list. Use `isRemoving(id)` on each rendered item to
 * apply the `deleting-item` CSS class, and call `animateRemove(ids, commit)`
 * to trigger the animation and then commit the actual removal.
 */
export const DELETE_ANIMATION_MS = 320;

export function useDeleteAnimation() {
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());

  const isRemoving = useCallback((id: string) => removing.has(id), [removing]);

  const animateRemove = useCallback(
    (ids: string | string[], commit: (id: string) => void) => {
      const list = Array.isArray(ids) ? ids : [ids];
      if (list.length === 0) return;
      setRemoving((prev) => {
        const next = new Set(prev);
        list.forEach((id) => next.add(id));
        return next;
      });
      list.forEach((id) => {
        const existing = timers.current.get(id);
        if (existing) window.clearTimeout(existing);
        const handle = window.setTimeout(() => {
          commit(id);
          setRemoving((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          timers.current.delete(id);
        }, DELETE_ANIMATION_MS);
        timers.current.set(id, handle);
      });
    },
    [],
  );

  return { isRemoving, animateRemove };
}