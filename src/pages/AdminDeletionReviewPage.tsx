import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isFounder } from "@/lib/founder";

type Pending = {
  user_id: string;
  display_name: string | null;
  deleted_at: string;
  deletion_status: string;
};

type ContentItem = {
  kind: "debate" | "live_session" | "template";
  id: string;
  title: string;
  created_at: string;
};

const AdminDeletionReviewPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<Pending[]>([]);
  const [contentByUser, setContentByUser] = useState<Record<string, ContentItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setAllowed(false); return; }
    (async () => {
      if (isFounder(user.id)) { setAllowed(true); return; }
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      setAllowed(!!data);
    })();
  }, [user, authLoading]);

  useEffect(() => {
    if (allowed !== true) return;
    (async () => {
      setLoading(true);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, deleted_at, deletion_status")
        .in("deletion_status", ["anonymized", "pending_review"])
        .gte("deleted_at", ninetyDaysAgo)
        .order("deleted_at", { ascending: false });
      const list = (profs ?? []) as Pending[];
      setAccounts(list);

      const ids = list.map((p) => p.user_id);
      if (ids.length) {
        const [debs, lives, tmpls] = await Promise.all([
          supabase.from("debates").select("id, topic, created_at, created_by").in("created_by", ids),
          supabase.from("live_sessions").select("id, title, created_at, created_by").in("created_by", ids),
          supabase.from("debate_templates").select("id, name, created_at, created_by").in("created_by", ids),
        ]);
        const grouped: Record<string, ContentItem[]> = {};
        (debs.data ?? []).forEach((d: any) => {
          (grouped[d.created_by] ||= []).push({ kind: "debate", id: d.id, title: d.topic, created_at: d.created_at });
        });
        (lives.data ?? []).forEach((s: any) => {
          (grouped[s.created_by] ||= []).push({ kind: "live_session", id: s.id, title: s.title, created_at: s.created_at });
        });
        (tmpls.data ?? []).forEach((t: any) => {
          (grouped[t.created_by] ||= []).push({ kind: "template", id: t.id, title: t.name, created_at: t.created_at });
        });
        setContentByUser(grouped);
      }
      setLoading(false);
    })();
  }, [allowed]);

  const removeItem = async (uid: string, item: ContentItem) => {
    const key = `${item.kind}:${item.id}`;
    setRemoving(key);
    const table = item.kind === "debate" ? "debates" : item.kind === "live_session" ? "live_sessions" : "debate_templates";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    setRemoving(null);
    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
      return;
    }
    setContentByUser((cur) => ({ ...cur, [uid]: (cur[uid] ?? []).filter((i) => !(i.kind === item.kind && i.id === item.id)) }));
    toast({ title: "Removed" });
  };

  if (allowed === false) {
    return <AppLayout><div className="max-w-2xl mx-auto px-4 py-12 font-body">Not found.</div></AppLayout>;
  }
  if (allowed === null) {
    return <AppLayout><div className="max-w-2xl mx-auto px-4 py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl mb-1">Deletion review</h1>
        <p className="text-xs text-muted-foreground font-body mb-6">
          Anonymized accounts from the past 90 days. Content stays by default — only remove items that are problematic.
        </p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : accounts.length === 0 ? (
          <div className="text-sm text-muted-foreground font-body py-12 text-center">No accounts to review.</div>
        ) : (
          <div className="space-y-6">
            {accounts.map((acct) => {
              const items = contentByUser[acct.user_id] ?? [];
              return (
                <section key={acct.user_id} className="border border-border rounded-lg p-5">
                  <header className="flex items-baseline justify-between mb-3">
                    <div>
                      <div className="font-display text-base">{acct.display_name ?? "Former user"}</div>
                      <div className="text-[11px] text-muted-foreground font-body font-mono">{acct.user_id}</div>
                    </div>
                    <div className="text-xs text-muted-foreground font-body">
                      {acct.deletion_status} · {new Date(acct.deleted_at).toLocaleDateString()}
                    </div>
                  </header>
                  {items.length === 0 ? (
                    <div className="text-xs text-muted-foreground font-body">No remaining content.</div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {items.map((it) => {
                        const key = `${it.kind}:${it.id}`;
                        return (
                          <li key={key} className="py-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-body truncate">{it.title}</div>
                              <div className="text-[11px] text-muted-foreground font-body">{it.kind} · {new Date(it.created_at).toLocaleDateString()}</div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(acct.user_id, it)}
                              disabled={removing === key}
                              className="font-body text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                            >
                              {removing === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-1" /> Remove</>}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminDeletionReviewPage;