import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type Prefs = { essential: boolean; marketing: boolean };

export default function SettingsEmailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>({ essential: true, marketing: true });
  const [loading, setLoading] = useState(true);

  useDocumentMeta({ title: "Email preferences · Dynamo", description: "Manage which Dynamo emails you receive." });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("email_prefs").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const p = (data?.email_prefs as Prefs | null) ?? { essential: true, marketing: true };
        setPrefs(p);
        setLoading(false);
      });
  }, [user]);

  async function update(next: Prefs) {
    setPrefs(next);
    const { error } = await supabase.from("profiles").update({ email_prefs: next as any }).eq("user_id", user!.id);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl mb-6">Email preferences</h1>
      {loading ? <div className="text-muted-foreground">Loading…</div> : (
      <div className="space-y-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Essential</div>
            <div className="text-sm text-muted-foreground">Authentication, safety, invites, billing. Always on.</div>
          </div>
          <Switch checked disabled />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Updates &amp; digest</div>
            <div className="text-sm text-muted-foreground">Weekly digest, club event announcements. One toggle.</div>
          </div>
          <Switch checked={prefs.marketing} onCheckedChange={(v) => update({ ...prefs, marketing: v })} />
        </Card>
      </div>
      )}
    </div>
  );
}