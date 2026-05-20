import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logAiUsage } from "../_shared/usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * §25 — Import-to-Record edge function.
 * v1 supports text-bearing sources (article URL via fetch + naive HTML strip,
 * or raw pasted text). Audio/video/PDF stubs return a friendly 501 so the
 * front-end can show "coming soon" without breaking.
 * Always private by default. Counts as 1 record toward Debate quota (the
 * caller increments `usage_counters` via `log-usage` if needed — kept out of
 * scope here to avoid double-counting).
 */

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Body = {
  kind: "url" | "text";
  source_url?: string;
  raw_text?: string;
  title_hint?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function structure(text: string, titleHint?: string) {
  const prompt = `You are restructuring a debate/discussion source into a clean record.
Return STRICT JSON with shape:
{
  "topic": string (concise, max 12 words),
  "subtopics": string[] (2-4),
  "sides": string[] (exactly 2, e.g. ["For","Against"] or domain-specific),
  "threads": Array<{"side_index": 0|1, "subtopic_index": number, "speaker": string, "text": string}>
}
Source title hint (optional): ${titleHint ?? ""}
SOURCE TEXT (truncated):\n${text.slice(0, 20000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Return ONLY valid JSON, no markdown fences." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  return { parsed: JSON.parse(cleaned), usage: json.usage };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;

    // Tier preflight — free tier may not import (per §25 monetization gate).
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier,status")
      .eq("user_id", user.id)
      .maybeSingle();
    const tier = (sub as any)?.tier ?? "free";
    if (tier === "free") {
      return new Response(JSON.stringify({
        error: "tier_required",
        message: "Importing records is a Pro feature. Upgrade to import debates from links or transcripts.",
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Daily soft cap — 20 imports/24h to bound runaway cost (§18).
    {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("debates")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .not("imported_source_kind", "is", null)
        .gte("created_at", since);
      if ((count ?? 0) >= 20) {
        return new Response(JSON.stringify({
          error: "daily_cap_reached",
          message: "You've hit today's import limit (20/day). Try again tomorrow.",
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Fetch source text
    let text = "";
    let sourceUrl: string | null = null;
    let sourceKind = "text";
    if (body.kind === "url" && body.source_url) {
      sourceUrl = body.source_url;
      // Naive YouTube/audio/video detection — not supported at v1
      if (/(youtube\.com|youtu\.be|\.mp[34]|\.wav|\.m4a)/i.test(body.source_url)) {
        return new Response(JSON.stringify({
          error: "source_kind_unsupported",
          message: "Audio and video imports are coming soon. For now, paste an article URL or the transcript text.",
        }), { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      sourceKind = "article";
      const r = await fetch(body.source_url, { headers: { "User-Agent": "DynamoBot/1.0" } });
      if (!r.ok) throw new Error(`fetch_failed_${r.status}`);
      text = stripHtml(await r.text());
    } else if (body.kind === "text" && body.raw_text) {
      text = body.raw_text;
    } else {
      return new Response(JSON.stringify({ error: "bad_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length < 200) {
      return new Response(JSON.stringify({ error: "source_too_short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { parsed: structured, usage } = await structure(text, body.title_hint);
    logAiUsage({
      function_name: "import-to-record",
      model: "google/gemini-2.5-flash",
      usage,
      user_id: user.id,
    });

    // Insert debate as completed/private/imported
    const { data: debate, error: insErr } = await supabase
      .from("debates")
      .insert({
        topic: String(structured.topic ?? "Imported record").slice(0, 240),
        created_by: user.id,
        is_public: false,
        status: "completed",
        ended_at: new Date().toISOString(),
        facilitator_type: "ai",
        feedback_enabled: false,
        imported_source_url: sourceUrl,
        imported_source_kind: sourceKind,
        description: body.title_hint ?? null,
      } as any)
      .select("id")
      .single();
    if (insErr) throw insErr;
    const debateId = debate.id as string;

    // Count this import toward the user's monthly session quota (§12).
    // Fire-and-forget; failure must not break the import.
    createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
      .rpc("increment_usage", { _user_id: user.id, _metric: "sessions_created" })
      .then(({ error }: any) => { if (error) console.error("import quota inc failed", error.message); });

    // Subtopics
    const subs: string[] = Array.isArray(structured.subtopics) && structured.subtopics.length
      ? structured.subtopics.slice(0, 4) : ["Main thread"];
    const { data: subtopicRows } = await supabase.from("debate_subtopics").insert(
      subs.map((title: string, i: number) => ({ debate_id: debateId, title, sort_order: i })),
    ).select("id, sort_order");

    // Sides
    const sideLabels: string[] = Array.isArray(structured.sides) && structured.sides.length === 2
      ? structured.sides : ["For", "Against"];
    const { data: sideRows } = await supabase.from("debate_sides").insert(
      sideLabels.map((label: string, i: number) => ({ debate_id: debateId, label, sort_order: i })),
    ).select("id, sort_order");

    // Transcript entries
    const sideById = (idx: number) => sideRows?.find((s: any) => s.sort_order === idx)?.id ?? null;
    const subById = (idx: number) => subtopicRows?.find((s: any) => s.sort_order === idx)?.id ?? null;
    const threads: any[] = Array.isArray(structured.threads) ? structured.threads : [];
    const entries = threads.map((t: any, i: number) => ({
      id: crypto.randomUUID(),
      turn_index: i,
      subtopic_id: subById(Number(t.subtopic_index) || 0),
      subtopic_index: Number(t.subtopic_index) || 0,
      side_id: sideById(Number(t.side_index) || 0),
      side_index: Number(t.side_index) || 0,
      speaker_name: String(t.speaker ?? "Speaker").slice(0, 120),
      text: String(t.text ?? "").slice(0, 4000),
      created_at: new Date().toISOString(),
    }));
    await supabase.from("debate_transcripts").insert({
      debate_id: debateId,
      transcript_entries: entries,
      argument_map: { nodes: [], imported: true },
    } as any);

    return new Response(JSON.stringify({ debate_id: debateId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-to-record error:", e);
    return new Response(JSON.stringify({ error: "import_failed", message: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});