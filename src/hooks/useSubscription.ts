import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TIER_CAPS, type Tier, type UsageMetric } from "@/lib/tiers";
import { isFounder } from "@/lib/founder";

interface UsageRow {
  sessions_created: number;
  notebooks_created: number;
  ai_calls: number;
  import_minutes: number;
  period_start: string;
}

interface SubscriptionState {
  tier: Tier;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [usage, setUsage] = useState<UsageRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setTier("free");
      setSub(null);
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const period = new Date();
    period.setUTCDate(1);
    period.setUTCHours(0, 0, 0, 0);
    const [subRes, usageRes] = await Promise.all([
      supabase.from("subscriptions").select("tier,status,current_period_end,cancel_at_period_end").eq("user_id", user.id).maybeSingle(),
      supabase.from("usage_counters").select("sessions_created,notebooks_created,ai_calls,import_minutes,period_start")
        .eq("user_id", user.id).eq("period_start", period.toISOString().slice(0, 10)).maybeSingle(),
    ]);
    if (subRes.data) {
      setSub(subRes.data as SubscriptionState);
      setTier((subRes.data.tier as Tier) || "free");
    }
    // Founder bypass — always treated as the highest paid tier client-side.
    if (isFounder(user.id)) setTier("pro");
    if (usageRes.data) setUsage(usageRes.data as UsageRow);
    else setUsage({ sessions_created: 0, notebooks_created: 0, ai_calls: 0, import_minutes: 0, period_start: period.toISOString().slice(0, 10) });
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const caps = TIER_CAPS[tier];

  const remaining = (metric: UsageMetric): number => {
    const cap = caps[metric];
    if (cap === Infinity) return Infinity;
    const used = usage?.[metric] ?? 0;
    return Math.max(0, cap - used);
  };

  const isAtCap = (metric: UsageMetric): boolean => remaining(metric) <= 0;

  return { tier, sub, usage, caps, loading, refresh, remaining, isAtCap };
}