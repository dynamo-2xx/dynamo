// §21 Performance Intelligence — analyzes a participant's transcript for a
// session and writes annotations. Two modes:
//   pass=live  → cheap, single passage, no recommendation
//   pass=deep  → end-of-session full sweep, includes recommendations
//
// Requires Premium tier (free users get 402). Server-side enforcement only;
// the client never writes to performance_annotations (RLS denies inserts).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  session_id: string;
  session_kind: "debate" | "cmm" | "live";
  participant_id: string;
  pass: "live" | "deep";
  passages: Array<{ transcript_entry_id?: string; text: string; subtopic_id?: string | null }>;
};

const SYSTEM = `You are a debate coach. For each passage, return JSON annotations of the form:
{ annotations: [{ attribute_group: "argumentative_integrity"|"rhetorical_effectiveness"|"engagement_quality"|"cognitive_depth", sub_attribute: string, severity: "green"|"orange"|"red", explanation: string, recommendation?: string }] }
Be concise (1-2 sentences). Only flag when the signal is clear. Recommendations only for deep pass.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supaUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supaUser.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const body = (await req.json()) as Body;
    if (!body?.session_id || !body?.participant_id || !body?.pass || !Array.isArray(body.passages)) {
      return new Response(JSON.stringify({ error: "bad payload" }), { status: 400, headers: corsHeaders });
    }

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Premium gate
    const { data: sub } = await supa.from("subscriptions").select("tier,status").eq("user_id", user.id).maybeSingle();
    const tier = (sub as any)?.tier ?? "free";
    if (tier === "free") {
      return new Response(JSON.stringify({ error: "premium_required" }), { status: 402, headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "ai_unavailable" }), { status: 500, headers: corsHeaders });

    const model = body.pass === "live" ? "google/gemini-3-flash-preview" : "google/gemini-2.5-pro";
    const userMsg = body.passages.map((p, i) => `[${i}] ${p.text}`).join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: corsHeaders });
    if (!aiRes.ok) return new Response(JSON.stringify({ error: `ai_${aiRes.status}` }), { status: 500, headers: corsHeaders });

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const anns: any[] = Array.isArray(parsed?.annotations) ? parsed.annotations : [];

    if (anns.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = anns
      .filter((a) => a && a.attribute_group && a.severity && a.explanation)
      .map((a, i) => ({
        session_id: body.session_id,
        session_kind: body.session_kind,
        participant_id: body.participant_id,
        subtopic_id: body.passages[Math.min(i, body.passages.length - 1)]?.subtopic_id ?? null,
        transcript_entry_id: body.passages[Math.min(i, body.passages.length - 1)]?.transcript_entry_id ?? null,
        attribute_group: a.attribute_group,
        sub_attribute: a.sub_attribute ?? null,
        severity: a.severity,
        pass_kind: body.pass,
        explanation: a.explanation,
        recommendation: body.pass === "deep" ? (a.recommendation ?? null) : null,
      }));

    const { error: insErr } = await supa.from("performance_annotations").insert(rows);
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});