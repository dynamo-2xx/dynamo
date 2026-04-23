import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a study companion. Given a user's free-form notes ("Thoughts") and their saved Annotations from a recorded debate session, produce a single clean, legible consolidation that helps them refine their thinking and prepare to publish a take.

Rules:
- Keep their voice and stance. Do not invent claims they did not make.
- Organize: 1) one-sentence headline take, 2) 2–4 short paragraphs of reasoning grounded in their highlights, 3) one short "Open questions" section if any tension remains.
- Plain prose, no bullet salad. Use markdown headings sparingly.
- Reference annotations by paraphrase, not block-quote dumps.
- 200–400 words total.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { sessionTitle } = body;
    const recordType: string = body.recordType || "live_session";
    const recordId: string | undefined = body.recordId || body.sessionId || body.session_id;
    if (!recordId) throw new Error("recordId required");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: nb } = await admin
      .from("session_notebooks")
      .select("*")
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: anns } = await admin
      .from("session_annotations")
      .select("excerpt, note")
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const thoughts = (nb?.thoughts as any)?.blocks?.[0]?.value || "";
    const annotations = (anns || []) as { excerpt: string; note: string }[];

    if (!thoughts.trim() && annotations.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userMsg = `Session: ${sessionTitle || "Untitled session"}\n\n=== THOUGHTS ===\n${thoughts || "(none)"}\n\n=== ANNOTATIONS (${annotations.length}) ===\n${annotations
      .map((a, i) => `${i + 1}. "${a.excerpt}"${a.note ? ` — note: ${a.note}` : ""}`)
      .join("\n")}\n\nProduce the consolidation now.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiResp.json();
    const myTake: string = aiJson.choices?.[0]?.message?.content?.trim() || "";
    if (!myTake) {
      return new Response(JSON.stringify({ error: "empty_take" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("session_notebooks")
      .upsert(
        {
          session_id: recordType === "live_session" ? recordId : null,
          record_type: recordType,
          record_id: recordId,
          user_id: userId,
          thoughts: nb?.thoughts || { blocks: [{ type: "text", value: thoughts }] },
          my_take: myTake,
        },
        { onConflict: "record_type,record_id,user_id" },
      );

    await admin.from("notifications").insert({
      recipient_id: userId,
      actor_id: userId,
      type: "notebook_take_ready",
      title: "Your take is ready",
      body: `We've consolidated your notes for "${sessionTitle || "this session"}".`,
      metadata: { session_id: recordType === "live_session" ? recordId : null, record_type: recordType, record_id: recordId },
    });

    return new Response(JSON.stringify({ ok: true, my_take: myTake }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("consolidate-notebook error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});