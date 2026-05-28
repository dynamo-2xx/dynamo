import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Founder-only toggle for §0 launch flag. Renders inline in the admin
 * dashboard. Flipping requires no deploy — gated by RLS to `is_admin`.
 */
export default function LaunchFlagControl() {
  const [launched, setLaunched] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("launch_config" as any)
      .select("is_public_launched")
      .maybeSingle();
    setLaunched(Boolean((data as any)?.is_public_launched));
  };
  useEffect(() => { void load(); }, []);

  const flip = async () => {
    if (launched === null) return;
    const next = !launched;
    if (!confirm(next
      ? "Open the gates? Visitors will see the full app instead of the waitlist."
      : "Re-enable the waitlist? Anonymous visitors will be bounced again.")) return;
    setBusy(true);
    const { error } = await supabase
      .from("launch_config" as any)
      .update({ is_public_launched: next, launched_at: next ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("id", true);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setLaunched(next);
    toast.success(next ? "Launched — public access live" : "Waitlist re-enabled");
  };

  if (launched === null) return null;
  return (
    <div className="flex items-center justify-between gap-4 border border-border rounded-lg px-4 py-3 bg-secondary/30">
      <div>
        <p className="text-sm font-semibold">Public launch</p>
        <p className="text-xs text-muted-foreground font-body">
          {launched
            ? "Live — anonymous visitors see the full app."
            : "Waitlist gate is up. Only authenticated users get in."}
        </p>
      </div>
      <Button
        size="sm"
        variant={launched ? "outline" : "default"}
        disabled={busy}
        onClick={flip}
      >
        {launched ? "Re-enable waitlist" : "Open the gates"}
      </Button>
    </div>
  );
}