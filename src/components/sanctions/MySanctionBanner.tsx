import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertOctagon } from "lucide-react";

interface Sanction {
  id: string;
  kind: string;
  reason: string | null;
  expires_at: string | null;
  appeal_status: string | null;
  appeal_note: string | null;
}

/**
 * §15 — Surfaces the logged-in user's active (unrevoked, unexpired) sanction
 * with a one-tap "Appeal" affordance. Quiet by default; only renders if a
 * sanction is live.
 */
export default function MySanctionBanner() {
  const { user } = useAuth();
  const [s, setS] = useState<Sanction | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setS(null); return; }
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("content_sanctions")
        .select("id, kind, reason, expires_at, appeal_status, appeal_note")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setS((data ?? null) as Sanction | null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!s) return null;

  const submit = async () => {
    if (!note.trim()) { toast.error("Add a note for the review team"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("content_sanctions")
      .update({
        appeal_note: note.trim().slice(0, 1000),
        appeal_status: "pending",
        appealed_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Appeal submitted");
    setS({ ...s, appeal_status: "pending", appeal_note: note.trim() });
    setOpen(false);
  };

  const expires = s.expires_at ? new Date(s.expires_at).toLocaleString() : "permanent";
  const alreadyAppealed = s.appeal_status === "pending" || s.appeal_status === "approved" || s.appeal_status === "denied";

  return (
    <div className="border-b border-foreground/10 bg-amber-50 text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-start gap-3 text-sm font-body">
        <AlertOctagon className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
        <div className="flex-1 min-w-0">
          <p>
            <span className="font-semibold capitalize">{s.kind.replace("_", " ")}</span> — {s.reason ?? "Policy violation"} · expires {expires}
          </p>
          {open ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Why should this be reviewed?"
                className="w-full border border-foreground/15 rounded-md p-2 text-xs bg-background"
              />
              <div className="flex gap-2">
                <button onClick={submit} disabled={busy} className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-semibold disabled:opacity-60">
                  {busy ? "Submitting…" : "Send appeal"}
                </button>
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs underline">Cancel</button>
              </div>
            </div>
          ) : alreadyAppealed ? (
            <p className="text-xs text-muted-foreground mt-0.5">Appeal status: {s.appeal_status}</p>
          ) : (
            <button onClick={() => setOpen(true)} className="text-xs underline mt-0.5">Appeal this</button>
          )}
        </div>
      </div>
    </div>
  );
}