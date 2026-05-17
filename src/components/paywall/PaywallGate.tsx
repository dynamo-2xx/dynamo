import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "./PaywallModal";
import type { UsageMetric } from "@/lib/tiers";

/**
 * Mount once at the top of any /create page. If the current user is at their
 * Free cap for `metric`, the paywall modal opens immediately and the children
 * are still rendered behind it (so the page state is preserved but the user
 * cannot interact past the modal). Pro/Edu/Civic users never see anything.
 */
export function PaywallGate({ metric, children }: { metric: UsageMetric; children: React.ReactNode }) {
  const sub = useSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sub.loading) return;
    if (sub.isAtCap(metric)) setOpen(true);
  }, [sub, metric]);

  return (
    <>
      {children}
      <PaywallModal
        open={open}
        onOpenChange={setOpen}
        metric={metric}
        used={sub.usage?.[metric] ?? 0}
      />
    </>
  );
}