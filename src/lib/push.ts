import { supabase } from "@/integrations/supabase/client";

// Public VAPID key (safe to expose). Must match VAPID_PUBLIC_KEY edge secret.
export const VAPID_PUBLIC_KEY =
  "BAyFk-CJrLng69SSzgJSLH-EyPN73k9-Q2GIw68NWZ0I7nFnIdFd9PLhVyO313JRhPvp6DScVNyE9-NCDZXr7cw";

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  return true;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  // Skip preview/iframe to avoid SW polluting Lovable preview cache.
  if (isPreviewHost() || isInIframe()) return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function ensurePushSubscribed(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (isPreviewHost() || isInIframe()) {
    return { ok: false, reason: "preview" };
  }

  // Permission
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const reg = await getRegistration();
  if (!reg) return { ok: false, reason: "no-registration" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no-user" };

  const p256dh = bufToB64Url(sub.getKey("p256dh"));
  const auth = bufToB64Url(sub.getKey("auth"));

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  return { ok: true };
}