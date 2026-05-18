import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * §17 — sitewide yellow banner shown while a Pro user's subscription is in
 * Stripe's smart-retry window. Persists across pages, dismisses only when
 * status leaves `pro_past_due`.
 */
export default function PastDueBanner() {
  const { sub } = useSubscription();
  const status = (sub as any)?.status;
  if (status !== "pro_past_due") return null;
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-100 text-amber-950 border-b border-amber-300">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="flex-1">
          Your last Pro charge failed. Update your card to keep Pro features.
        </span>
        <Link to="/settings/billing" className="underline font-medium whitespace-nowrap">
          Update card
        </Link>
      </div>
    </div>
  );
}