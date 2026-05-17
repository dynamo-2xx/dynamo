// §16 — Generic transactional email dispatcher. Accepts a template key + args,
// resolves to a rendered template from _shared/email-templates.ts, and sends
// via Resend. Honors:
//   - email_suppressions (hard block, even essential? → essential still goes)
//   - profiles.email_prefs.marketing toggle for marketing-category templates
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";
import * as T from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = { to: string; template: string; args?: Record<string, any>; user_id?: string };

function renderTemplate(key: string, args: any): T.Tpl | null {
  const map: Record<string, (a: any) => T.Tpl> = {
    auth_verify: (a) => T.authVerify(a.link),
    auth_magic_link: (a) => T.authMagicLink(a.link),
    auth_password_reset: (a) => T.authPasswordReset(a.link),
    invite_debate: (a) => T.inviteDebate(a),
    invite_accepted: (a) => T.inviteAccepted(a),
    club_join_approved: (a) => T.clubJoinApproved(a),
    club_event_announced: (a) => T.clubEventAnnounced(a),
    report_acknowledged: (a) => T.reportAcknowledged(a),
    sanction_notice: (a) => T.sanctionNotice(a),
    appeal_decision: (a) => T.appealDecision(a),
    payment_receipt: (a) => T.paymentReceipt(a),
    payment_failed: (a) => T.paymentFailed(a),
  };
  const fn = map[key];
  return fn ? fn(args || {}) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const tpl = renderTemplate(body.template, body.args || {});
    if (!tpl) {
      return new Response(JSON.stringify({ error: "unknown_template" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Suppression check — never send to bounced/complained addresses.
    const { data: sup } = await sb.from("email_suppressions").select("email").eq("email", body.to.toLowerCase()).maybeSingle();
    if (sup) return new Response(JSON.stringify({ ok: false, suppressed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Marketing preference check — essential always sends.
    if (tpl.category === "marketing" && body.user_id) {
      const { data: prof } = await sb.from("profiles").select("email_prefs").eq("user_id", body.user_id).maybeSingle();
      const prefs = (prof as any)?.email_prefs as { marketing?: boolean } | null;
      if (prefs && prefs.marketing === false) {
        return new Response(JSON.stringify({ ok: false, unsubscribed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const result = await sendEmail({ to: body.to, ...tpl });
    return new Response(JSON.stringify(result), { status: result.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});