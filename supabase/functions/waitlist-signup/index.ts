// §11 — Waitlist signup. Open to anonymous visitors. Inserts into `waitlist`
// (idempotent on email), captures referrer/utm, sends a thank-you email with
// the user's position number.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail, brandedShell } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const referrer = body.referrer ? String(body.referrer).slice(0, 500) : null;
    const utm_source = body.utm_source ? String(body.utm_source).slice(0, 100) : null;
    const utm_medium = body.utm_medium ? String(body.utm_medium).slice(0, 100) : null;
    const utm_campaign = body.utm_campaign ? String(body.utm_campaign).slice(0, 100) : null;
    const source = body.invite_code ? "invite_credit" : "organic";

    const db = admin();
    // Idempotent insert — if email already present, return their existing row.
    const { data: existing } = await db
      .from("waitlist")
      .select("id, position")
      .eq("email", email)
      .maybeSingle();

    let position: number | null = existing?.position ?? null;
    let firstTime = false;

    if (!existing) {
      const { data: inserted, error } = await db
        .from("waitlist")
        .insert({ email, referrer, utm_source, utm_medium, utm_campaign, source })
        .select("position")
        .single();
      if (error) throw error;
      position = inserted.position;
      firstTime = true;
    }

    // Thank-you email (essential, not marketing)
    if (firstTime) {
      const html = brandedShell({
        title: "You're on the list.",
        bodyHtml: `<p>Welcome to Dynamo. You're <strong>#${position}</strong> in line.</p>
          <p>Dynamo turns real conversations into permanent civic record. We'll email you the moment your slot opens.</p>
          <p style="color:#6b7280;font-size:13px;">If this wasn't you, ignore this email — we won't add you again.</p>`,
      });
      await sendEmail({
        to: email,
        subject: `You're #${position} on the Dynamo waitlist`,
        html,
        category: "essential",
      }).catch((e) => console.error("[waitlist] email failed:", e));
    }

    return new Response(JSON.stringify({ ok: true, position, firstTime }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[waitlist-signup] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});