import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * §19 sitewide incident banner.
 * Reads `feature_flags.incident_banner = { enabled, message }`.
 * Admins toggle via /admin or by editing the row directly. Updates live via
 * Realtime so the bar appears/disappears without a refresh.
 */
interface FlagValue {
  enabled?: boolean;
  message?: string;
}

const IncidentBanner = () => {
  const [flag, setFlag] = useState<FlagValue>({ enabled: false, message: "" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("feature_flags")
        .select("value")
        .eq("key", "incident_banner")
        .maybeSingle();
      if (cancelled) return;
      const v = (data?.value ?? {}) as FlagValue;
      setFlag({ enabled: !!v.enabled, message: v.message ?? "" });
    };
    void load();

    const channel = supabase
      .channel("feature_flags_incident_banner")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags", filter: "key=eq.incident_banner" },
        (payload: any) => {
          const v = (payload?.new?.value ?? {}) as FlagValue;
          setFlag({ enabled: !!v.enabled, message: v.message ?? "" });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!flag.enabled) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-[101] flex items-center justify-center gap-2 py-1.5 px-3 bg-destructive text-destructive-foreground text-xs font-body"
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
      <span className="truncate">
        {flag.message?.trim() || "We're investigating an incident — some features may be degraded."}
      </span>
      <a
        href="https://status.dynamo.today"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 shrink-0"
      >
        Status
      </a>
    </div>
  );
};

export default IncidentBanner;