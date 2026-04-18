// Edge function: deletes the calling user's account and all their data.
// Auth: requires a valid Supabase JWT (verify_jwt = true via default config).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // Identify the calling user using the anon client + their JWT.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    // Service-role client for cascading data delete.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Delete user-owned content. Order matters where FKs exist; most tables
    // are not FK-linked but contain user_id columns we want to clear.
    // We swallow individual table errors to avoid blocking account deletion.
    const tableDeletes: Array<Promise<unknown>> = [
      admin.from("connections").delete().or(`follower_id.eq.${userId},followed_id.eq.${userId}`),
      admin.from("user_presence").delete().eq("user_id", userId),
      admin.from("debate_invitations").delete().eq("invited_user_id", userId),
      admin.from("debate_participants").delete().eq("user_id", userId),
      admin.from("debate_grades").delete().eq("user_id", userId),
      admin.from("live_sessions").delete().eq("created_by", userId),
      admin.from("debate_templates").delete().eq("created_by", userId),
      admin.from("debates").delete().eq("created_by", userId),
      admin.from("profiles").delete().eq("user_id", userId),
    ];
    await Promise.allSettled(tableDeletes);

    // Finally remove the auth user. Requires service role.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
