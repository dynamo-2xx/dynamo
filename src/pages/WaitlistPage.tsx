import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLaunchFlag } from "@/hooks/useLaunchFlag";
import { toast } from "sonner";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/**
 * §0 — Public landing while the launch flag is off. Replaces the home page
 * for unauthenticated visitors. Authenticated users (or after launch) are
 * bounced to /home automatically.
 */
const WaitlistPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isLaunched } = useLaunchFlag();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  useDocumentMeta({
    title: "Dynamo — join the waitlist",
    description: "Dynamo turns conversations into structured, searchable records. Reserve your spot.",
  });

  // Auto-bounce already-signed-in users or once launch flips.
  useEffect(() => {
    if (loading) return;
    if (user) navigate("/home", { replace: true });
    else if (isLaunched) navigate("/home", { replace: true });
  }, [user, loading, isLaunched, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error("Enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("waitlist-signup", {
        body: { email: trimmed, referrer: document.referrer || null },
      });
      if (error) throw error;
      setPosition((data as any)?.position ?? null);
      toast.success("You're on the list");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't join — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-serif tracking-tight">Dynamo.</h1>
          <p className="text-base md:text-lg text-muted-foreground font-body">
            Turn the conversations that matter — debates, classes, civic meetings — into
            structured, searchable records. By invitation.
          </p>
        </div>

        {position !== null ? (
          <div className="border border-border rounded-xl px-6 py-8 bg-secondary/30">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">You're #{position} on the list</p>
            <p className="mt-2 text-sm font-body">
              We'll email you when your seat opens.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-foreground text-background rounded-lg px-5 py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Reserve seat"}
            </button>
          </form>
        )}

        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 flex items-center justify-center gap-4">
          <a href="/terms" className="hover:text-foreground">Terms</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-foreground">Privacy</a>
          <span>·</span>
          <a href="/auth" className="hover:text-foreground">I have an account</a>
        </div>
      </div>
    </div>
  );
};

export default WaitlistPage;