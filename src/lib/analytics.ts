/**
 * §10 Analytics — thin wrapper that lazily initializes PostHog when
 * VITE_POSTHOG_KEY is present, otherwise is a noop. Safe to call from any
 * component; never throws. Replace stub with real posthog-js install when key
 * is provisioned.
 */
type Props = Record<string, unknown>;

let ready = false;
let queue: Array<{ event: string; props?: Props }> = [];
let ph: any = null;

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

async function init() {
  if (ready || !key) return;
  try {
    // Dynamic import keeps bundle slim until a key is configured.
    const mod: any = await import(/* @vite-ignore */ "posthog-js").catch(() => null);
    if (!mod?.default) return;
    ph = mod.default;
    ph.init(key, { api_host: host, capture_pageview: true, autocapture: false });
    ready = true;
    queue.splice(0).forEach(({ event, props }) => ph.capture(event, props));
  } catch {
    // swallow — analytics must never break the app
  }
}

export function track(event: string, props?: Props) {
  if (!key) {
    if (import.meta.env.DEV) console.debug("[analytics]", event, props);
    return;
  }
  if (!ready) {
    queue.push({ event, props });
    void init();
    return;
  }
  try {
    ph?.capture(event, props);
  } catch {}
}

export function identify(userId: string, traits?: Props) {
  if (!key) return;
  if (!ready) {
    void init().then(() => ph?.identify(userId, traits));
    return;
  }
  try {
    ph?.identify(userId, traits);
  } catch {}
}

export function reset() {
  try { ph?.reset(); } catch {}
}