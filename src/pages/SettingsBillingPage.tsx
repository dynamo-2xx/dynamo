import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { TIER_LABELS } from "@/lib/tiers";

export default function SettingsBillingPage() {
  const { user } = useAuth();
  const { tier, subscription } = useSubscription();
  const [events, setEvents] = useState<any[]>([]);

  useDocumentMeta({ title: "Billing · Dynamo", description: "Manage your Dynamo subscription and view payment history." });

  useEffect(() => {
    if (!user) return;
    supabase.from("billing_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setEvents(data ?? []));
  }, [user]);

  const status = subscription?.status ?? "free";
  const isPastDue = status === "pro_past_due";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl mb-6">Billing</h1>

      {isPastDue && (
        <Card className="p-4 mb-4 border-destructive">
          <div className="font-medium text-destructive mb-1">Payment issue</div>
          <p className="text-sm text-muted-foreground mb-3">Your last charge failed. Update your card to keep Pro access.</p>
          <Button variant="destructive" size="sm" disabled>Open Stripe portal</Button>
        </Card>
      )}

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</div>
            <div className="font-display text-2xl">{TIER_LABELS[tier]}</div>
          </div>
          <Badge variant="secondary">{status}</Badge>
        </div>
        {tier === "free" ? (
          <Link to="/pricing"><Button>Upgrade to Pro</Button></Link>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" disabled>Manage in Stripe</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Stripe Customer Portal opens after billing is enabled. Email <a className="underline" href="mailto:billing@mail.dynamo.today">billing@mail.dynamo.today</a> for refunds.
        </p>
      </Card>

      <h2 className="font-display text-xl mb-3">Recent invoices</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No billing events yet.</p>
      ) : (
        <Card className="divide-y">
          {events.map((e) => (
            <div key={e.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{e.event_type}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
              </div>
              <div className="tabular-nums">
                {e.amount_cents != null ? `${(e.amount_cents / 100).toFixed(2)} ${(e.currency || "USD").toUpperCase()}` : "—"}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}