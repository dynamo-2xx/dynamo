import { useState, useCallback } from "react";
import { useSubscription } from "./useSubscription";
import type { UsageMetric } from "@/lib/tiers";
import { track } from "@/lib/analytics";

/**
 * §12 — Hard paywall guard. Wraps a metric check + modal state.
 * Usage:
 *   const paywall = usePaywall();
 *   if (!paywall.assert("sessions_created")) return; // modal opens
 *   // proceed with create action
 */
export function usePaywall() {
  const sub = useSubscription();
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<UsageMetric>("sessions_created");

  const assert = useCallback((m: UsageMetric): boolean => {
    if (sub.loading) return true; // optimistic — don't block while loading
    if (!sub.isAtCap(m)) return true;
    setMetric(m);
    setOpen(true);
    track("paywall_hit", { metric: m, tier: sub.tier });
    return false;
  }, [sub]);

  return {
    assert,
    modal: { open, onOpenChange: setOpen, metric, used: sub.usage?.[metric] ?? 0 },
    sub,
  };
}