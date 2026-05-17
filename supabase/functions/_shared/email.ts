// Minimal email helper shared across transactional functions.
// Uses Resend (RESEND_API_KEY) with mail.dynamo.today as sender.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = "Dynamo <hello@mail.dynamo.today>";

export type SendOpts = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  category?: string; // 'essential' | 'marketing' (informational only)
  headers?: Record<string, string>;
};

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not configured" };
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
  const body: Record<string, unknown> = {
    from: opts.from || DEFAULT_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: {
      // RFC 8058 one-click unsubscribe for marketing mail
      ...(opts.category === "marketing"
        ? {
            "List-Unsubscribe": "<https://dynamo.today/settings/email>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : {}),
      ...(opts.headers || {}),
    },
  };
  const res = await fetch("https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  const json = await res.json().catch(() => ({} as any));
  return { ok: true, id: json?.id };
}

export function brandedShell(opts: { title: string; bodyHtml: string; footerNote?: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'DM Sans',sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="font-family:'Instrument Serif',serif;font-size:28px;letter-spacing:-0.01em;margin-bottom:24px;">${opts.title}</div>
      <div style="font-size:15px;line-height:1.55;">${opts.bodyHtml}</div>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.08);font-size:12px;color:#6b7280;">
        ${opts.footerNote ?? `You're receiving this from Dynamo. <a href="https://dynamo.today/settings/email" style="color:#6b7280;">Manage email preferences</a>.`}
      </div>
    </div>
  </body></html>`;
}