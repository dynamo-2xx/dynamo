// GDPR "Download my data" — returns a JSON blob of the caller's content.
// Rate-limited to once per 7 days via profiles.last_export_at.
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

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Rate limit: 1 per 7 days.
    const { data: prof } = await admin.from("profiles")
      .select("last_export_at").eq("user_id", userId).maybeSingle();
    if (prof?.last_export_at) {
      const last = new Date(prof.last_export_at).getTime();
      if (Date.now() - last < 7 * 24 * 3600 * 1000) {
        const nextAvail = new Date(last + 7 * 24 * 3600 * 1000).toISOString();
        return new Response(JSON.stringify({
          error: "rate_limited",
          message: "You can export your data once every 7 days.",
          next_available_at: nextAvail,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const [profile, debates, liveSessions, templates, participations, grades, dmsSent, notifyIntents] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("debates").select("*").eq("created_by", userId),
      admin.from("live_sessions").select("*").eq("created_by", userId),
      admin.from("debate_templates").select("*").eq("created_by", userId),
      admin.from("debate_participants").select("*").eq("user_id", userId),
      admin.from("debate_grades").select("*").eq("user_id", userId),
      admin.from("dm_messages").select("*").eq("sender_id", userId),
      admin.from("debate_notify_subscriptions").select("*").eq("user_id", userId),
    ]);

    const debateIds = (debates.data ?? []).map((d: any) => d.id);
    const liveIds = (liveSessions.data ?? []).map((s: any) => s.id);

    const [transcripts, sides, subtopics, arguments_, liveEntries] = await Promise.all([
      debateIds.length
        ? admin.from("debate_transcripts").select("*").in("debate_id", debateIds)
        : Promise.resolve({ data: [] }),
      debateIds.length
        ? admin.from("debate_sides").select("*").in("debate_id", debateIds)
        : Promise.resolve({ data: [] }),
      debateIds.length
        ? admin.from("debate_subtopics").select("*").in("debate_id", debateIds)
        : Promise.resolve({ data: [] }),
      debateIds.length
        ? admin.from("arguments").select("*").in("debate_id", debateIds)
        : Promise.resolve({ data: [] }),
      liveIds.length
        ? admin.from("live_session_entries").select("*").in("session_id", liveIds)
        : Promise.resolve({ data: [] }),
    ]);

    const payload = {
      generated_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data,
      debates_created: debates.data,
      debate_transcripts: transcripts.data,
      debate_sides: sides.data,
      debate_subtopics: subtopics.data,
      debate_arguments: arguments_.data,
      live_sessions_hosted: liveSessions.data,
      live_session_entries: liveEntries.data,
      debate_templates: templates.data,
      debate_participations: participations.data,
      debate_grades: grades.data,
      dm_messages_sent: dmsSent.data,
      debate_notify_intents: notifyIntents.data,
      note: "Other speakers' transcript lines are excluded for privacy. Uploaded media (avatars, banners, covers) are referenced by URL.",
    };

    await admin.from("profiles").update({ last_export_at: new Date().toISOString() }).eq("user_id", userId);

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="dynamo-export-${userId}.json"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});