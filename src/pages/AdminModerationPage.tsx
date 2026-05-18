import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isFounder } from "@/lib/founder";

/**
 * §15 Trust & Safety — admin moderation queue. Lists open content reports,
 * lets an admin resolve them (dismiss / action-taken) and optionally issue a
 * sanction (warn / mute / suspend) on the offending user.
 */

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  severity: number;
  created_at: string;
};

const STATUS_FILTERS = ["open", "reviewing", "resolved", "dismissed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const AdminModerationPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setAllowed(false); return; }
    (async () => {
      if (isFounder(user.id)) { setAllowed(true); return; }
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      setAllowed(!!data);
    })();
  }, [user, authLoading]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_reports")
      .select("id, reporter_id, target_type, target_id, reason, details, status, severity, created_at")
      .eq("status", statusFilter)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast({ title: "Failed to load reports", description: error.message, variant: "destructive" });
    setReports((data ?? []) as Report[]);
    setLoading(false);
  };

  useEffect(() => {
    if (allowed === true) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, statusFilter]);

  const resolve = async (id: string, newStatus: "resolved" | "dismissed", note?: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("content_reports")
      .update({
        status: newStatus,
        reviewer_id: user!.id,
        reviewed_at: new Date().toISOString(),
        resolution_note: note ?? null,
      })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Marked ${newStatus}` });
      setReports((rs) => rs.filter((r) => r.id !== id));
    }
  };

  const sanction = async (report: Report, kind: "warn" | "mute_24h" | "suspend_7d") => {
    setBusy(report.id);
    // Resolve the report which user this targets — for message/comment targets we
    // can't trivially infer author here, so we sanction the reporter's target only
    // when target_type='profile'. For everything else admins must use the
    // dedicated user-sanction tool (deferred). Show a clear error otherwise.
    if (report.target_type !== "profile") {
      toast({
        title: "Sanction requires target user",
        description: "Open the underlying content to apply a sanction to the author.",
        variant: "destructive",
      });
      setBusy(null);
      return;
    }
    const expires =
      kind === "mute_24h" ? new Date(Date.now() + 24 * 3600_000).toISOString()
      : kind === "suspend_7d" ? new Date(Date.now() + 7 * 86400_000).toISOString()
      : null;
    const { error } = await supabase.from("content_sanctions").insert({
      user_id: report.target_id,
      kind,
      reason: report.reason,
      related_report_id: report.id,
      issued_by: user!.id,
      expires_at: expires,
    });
    if (error) {
      toast({ title: "Sanction failed", description: error.message, variant: "destructive" });
      setBusy(null);
      return;
    }
    await resolve(report.id, "resolved", `Sanction issued: ${kind}`);
  };

  if (allowed === false) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-24 text-center">
          <Shield className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h1 className="font-display text-2xl mb-2">Admins only</h1>
          <p className="font-body text-sm text-muted-foreground">You don't have access to the moderation queue.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl">Moderation</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Review reported content and apply sanctions.
            </p>
          </div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-border">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-body capitalize transition-colors ${
                statusFilter === s ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-sm font-body text-muted-foreground">
            No <span className="capitalize">{statusFilter}</span> reports.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                        {r.target_type}
                      </span>
                      <span className="text-xs font-body">{r.reason}</span>
                      {r.severity >= 3 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
                          <AlertTriangle className="w-3 h-3" /> sev {r.severity}
                        </span>
                      )}
                    </div>
                    {r.details && (
                      <p className="text-sm font-body text-foreground/80 line-clamp-3 mb-1">{r.details}</p>
                    )}
                    <p className="text-[11px] font-body text-muted-foreground">
                      target {r.target_id.slice(0, 8)} • {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {statusFilter === "open" && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => resolve(r.id, "dismissed", "Not actionable")}>
                      <X className="w-3.5 h-3.5 mr-1" /> Dismiss
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => resolve(r.id, "resolved")}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Resolve
                    </Button>
                    {r.target_type === "profile" && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => sanction(r, "warn")}>Warn</Button>
                        <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => sanction(r, "mute_24h")}>Mute 24h</Button>
                        <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => sanction(r, "suspend_7d")}>Suspend 7d</Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminModerationPage;