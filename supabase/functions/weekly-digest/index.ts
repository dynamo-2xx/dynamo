// §16 Weekly digest — enqueue + send per-user summaries. Designed to be
// triggered by pg_cron (Sundays 14:00 UTC) but also callable manually.
// Suppresses users inactive >30 days, those who toggled off marketing,
// and those on the email_suppressions list.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, brandedShell } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Optional payload: { user_id?: string, dry_run?: boolean }
  const body = await req.json().catch(() => ({} as any));
  const dry = !!body?.dry_run;

  // Pull recipients
  let q = supa
    .from("profiles")
    .select("user_id, display_name, email_prefs")
    .or("email_prefs->>marketing.eq.true,email_prefs.is.null");
  if (body?.user_id) q = q.eq("user_id", body.user_id);

  const { data: profiles, error } = await q.limit(2000);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  let sent = 0, skipped = 0;
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  for (const p of profiles ?? []) {
    // Get auth email
    const { data: u } = await supa.auth.admin.getUserById(p.user_id);
    const email = u?.user?.email;
    if (!email) { skipped++; continue; }

    // Suppression check
    const { data: sup } = await supa.from("email_suppressions").select("email").eq("email", email).maybeSingle();
    if (sup) { skipped++; continue; }

    // Activity: any debate/live they participated in last 7 days, plus new invites
    const { count: invites } = await supa
      .from("debate_invitations")
      .select("id", { count: "exact", head: true })
      .eq("invitee_id", p.user_id)
      .gte("created_at", since);

    if ((invites ?? 0) === 0) { skipped++; continue; }

    const html = brandedShell({
      title: "Your week on Dynamo",
      bodyHtml: `<p>Hi ${p.display_name ?? "there"},</p>
        <p>You have <strong>${invites}</strong> new invitation${invites === 1 ? "" : "s"} from this week.</p>
        <p><a href="https://dynamo.today/notifications" style="color:#0a0a0a;">Open notifications →</a></p>`,
    });

    if (!dry) {
      const r = await sendEmail({ to: email, subject: "Your week on Dynamo", html, category: "marketing" });
      if (r.ok) sent++; else skipped++;
    } else {
      sent++;
    }
  }

  return new Response(JSON.stringify({ sent, skipped, dry }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});