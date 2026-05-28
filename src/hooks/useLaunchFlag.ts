import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads the singleton `launch_config.is_public_launched` flag.
 * - `null` while loading (treat as "not launched" for guard purposes).
 * - Polls every 60s so a founder flip propagates without a refresh.
 */
export function useLaunchFlag() {
  const [isLaunched, setIsLaunched] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("launch_config" as any)
        .select("is_public_launched")
        .maybeSingle();
      if (cancelled) return;
      setIsLaunched(Boolean((data as any)?.is_public_launched));
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { isLaunched };
}