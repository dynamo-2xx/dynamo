import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ShareClaimPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"idle" | "claiming" | "done" | "error">("idle");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/auth?redirect=/share/${token}`);
      return;
    }
    if (!token || status !== "idle") return;
    setStatus("claiming");
    (async () => {
      const { data, error } = await supabase.rpc("accept_share_invitation", { _token: token });
      if (error || !data?.length) {
        toast.error(error?.message || "Invitation expired or invalid");
        setStatus("error");
        setTimeout(() => navigate("/"), 1500);
        return;
      }
      const row = data[0] as any;
      toast.success(row.fork_id ? "Co-owner access + personal fork created" : "Access granted");
      setStatus("done");
      const t = row.record_type as string;
      const id = row.fork_id || row.record_id;
      if (t === "live_session") navigate(`/live/${id}`);
      else if (t === "notebook") navigate(`/study/${id}`);
      else navigate(`/debate/${id}`);
    })();
  }, [user, loading, token, status, navigate]);

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Claiming your access…</p>
      </div>
    </AppLayout>
  );
};

export default ShareClaimPage;