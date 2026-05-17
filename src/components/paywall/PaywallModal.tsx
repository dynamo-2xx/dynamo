import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { metricLabel, TIER_CAPS, type UsageMetric } from "@/lib/tiers";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: UsageMetric;
  used: number;
}

export function PaywallModal({ open, onOpenChange, metric, used }: Props) {
  const navigate = useNavigate();
  const cap = TIER_CAPS.free[metric];

  useEffect(() => {
    if (open) track("upgrade_modal_shown", { metric, used, cap });
  }, [open, metric, used, cap]);

  const goPro = () => {
    track("checkout_started", { metric, source: "paywall_modal" });
    onOpenChange(false);
    navigate("/pricing");
  };

  const pct = Math.min(100, Math.round((used / Math.max(1, cap)) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">You've reached your Free limit</DialogTitle>
          <DialogDescription>
            You've used <strong>{used}</strong> of <strong>{cap}</strong> {metricLabel(metric)} this month.
            Upgrade to Pro to keep going.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground mt-2">{pct}% used</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Maybe later</Button>
          <Button onClick={goPro}>Upgrade to Pro</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}