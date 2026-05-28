import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLaunchFlag } from "@/hooks/useLaunchFlag";

/**
 * §0 — Waitlist gate. Until the founder flips `launch_config.is_public_launched`
 * to true, anonymous visitors hitting public surfaces are bounced to /waitlist.
 *
 * Whitelisted (always reachable while flag is off):
 * - /waitlist, /auth, /terms, /privacy, /guidelines, /legal/*, /status
 * - /join/:code, /preview/:token, /share/:token (invitee preview)
 * - /debate/:id/projector, /debate/:id/audience (in-room read-only views)
 * Authenticated users always bypass the gate.
 */
const ALLOW_ANON_PREFIXES = [
  "/waitlist",
  "/auth",
  "/terms",
  "/privacy",
  "/guidelines",
  "/legal",
  "/status",
  "/join",
  "/preview",
  "/share",
];

export default function LaunchGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isLaunched } = useLaunchFlag();
  const location = useLocation();

  // While we still don't know the auth or flag state, render nothing — the
  // brief blank avoids flashing public content before redirecting.
  if (loading || isLaunched === null) return null;
  if (user) return <>{children}</>;
  if (isLaunched) return <>{children}</>;

  const path = location.pathname;
  const allowed =
    ALLOW_ANON_PREFIXES.some((p) => path === p || path.startsWith(p + "/")) ||
    /^\/debate\/[^/]+\/(projector|audience|project-code)$/.test(path);
  if (allowed) return <>{children}</>;

  return <Navigate to="/waitlist" replace />;
}