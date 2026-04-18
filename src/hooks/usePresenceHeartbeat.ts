import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Updates user_presence.last_seen_at every 60s while authenticated. */
export function usePresenceHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const ping = async () => {
      if (stopped) return;
      try {
        await (supabase as any)
          .from("user_presence")
          .upsert(
            { user_id: user.id, last_seen_at: new Date().toISOString() },
            { onConflict: "user_id" },
          );
      } catch (e) {
        // silent
      }
    };

    ping();
    const t = window.setInterval(ping, 60_000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [user]);
}
