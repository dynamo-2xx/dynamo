// §21 Performance Intelligence v2 — 50-tag polarity analyzer.
//   pass=live  → one argument unit, LIVE TAG SET only (Flash)
//   pass=deep  → full transcript, LIVE + POST-SESSION TAG SET (Pro), with
//                cross-turn citations resolved into transcript_entry_ids.
//
// Premium tier required (free users get 402). Founder bypasses.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  LIVE_SYSTEM_PROMPT,
  POST_SESSION_SYSTEM_PROMPT,
  LIVE_TAG_LABELS,
  POST_SESSION_TAG_LABELS,
  PERF_TAGS,
  FOUNDER_USER_ID,
} from "../_shared/perf-tags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Passage = {
  transcript_entry_id?: string;
  text: string;
  subtopic_id?: string | null;
};
type Body = {
  session_id: string;
  session_kind: "debate" | "cmm" | "live" | "imported";
  participant_id: string;
  pass: "live" | "deep";
  passages: Passage[];
};

const TAG_INFO = new Map(PERF_TAGS.map((t) => [t.label, t]));
const LIVE_LABEL_SET = new Set(LIVE_TAG_LABELS);
const ALL_LABEL_SET = new Set(POST_SESSION_TAG_LABELS);

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

    // Premium gate (founder bypass)
    if (user.id !== FOUNDER_USER_ID) {
      const { data: sub } = await supa.from("subscriptions").select("tier,status").eq("user_id", user.id).maybeSingle();
      const tier = (sub as any)?.tier ?? "free";
      if (tier === "free") {
        return new Response(JSON.stringify({ error: "premium_required" }), { status: 402, headers: corsHeaders });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "ai_unavailable" }), { status: 500, headers: corsHeaders });

    const isDeep = body.pass === "deep";
    const model = isDeep ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
    const systemPrompt = isDeep ? POST_SESSION_SYSTEM_PROMPT : LIVE_SYSTEM_PROMPT;

    // Number each passage with its turn_index so the model can cite cross-turn context.
    const userMsg = body.passages
      .map((p, i) => `[turn ${i}]\n${p.text}`)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: corsHeaders });
    if (!aiRes.ok) return new Response(JSON.stringify({ error: `ai_${aiRes.status}` }), { status: 500, headers: corsHeaders });

    const aiJson = await aiRes.json();
    try {
      const { logAiUsage } = await import("../_shared/usage.ts");
      logAiUsage({
        function_name: "analyze-performance",
        model,
        usage: aiJson.usage,
        user_id: user.id,
        session_id: body.session_id,
      });
    } catch (_) {}
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch (_) {
      // Some models wrap JSON in prose. Best-effort recovery.
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
    }
    const anns: any[] = Array.isArray(parsed?.annotations) ? parsed.annotations : [];
    const labelSet = isDeep ? ALL_LABEL_SET : LIVE_LABEL_SET;

    const rows = anns
      .map((a) => {
        if (!a || typeof a !== "object") return null;
        const label = String(a.tag_label ?? "").trim();
        if (!labelSet.has(label)) return null;
        const polRaw = String(a.polarity ?? "").trim().toLowerCase();
        const tagInfo = TAG_INFO.get(label);
        const polarity = polRaw === "positive" || polRaw === "negative"
          ? polRaw
          : tagInfo?.polarity ?? "negative";
        const span = String(a.span_text ?? "").trim();
        if (!span) return null;
        const reason = String(a.reason ?? "").trim();
        if (!reason) return null;

        // Resolve which passage this belongs to.
        const turnIdx = isDeep && Number.isInteger(a.turn_index) ? Number(a.turn_index) : 0;
        const passage = body.passages[Math.min(Math.max(turnIdx, 0), body.passages.length - 1)];

        // Resolve cited_turns → transcript_entry_ids.
        let cited: string[] | null = null;
        if (Array.isArray(a.cited_turns)) {
          cited = a.cited_turns
            .map((n: any) => Number(n))
            .filter((n: number) => Number.isInteger(n) && n >= 0 && n < body.passages.length)
            .map((n: number) => body.passages[n]?.transcript_entry_id)
            .filter((s: any): s is string => typeof s === "string" && s.length > 0);
          if (cited && cited.length === 0) cited = null;
        }

        return {
          session_id: body.session_id,
          session_kind: body.session_kind,
          participant_id: body.participant_id,
          subtopic_id: passage?.subtopic_id ?? null,
          transcript_entry_id: passage?.transcript_entry_id ?? null,
          tag_label: label,
          polarity,
          span_text: span,
          cited_entry_ids: cited,
          pass_kind: body.pass,
          explanation: reason,
          recommendation: null,
          // Legacy mirrors so old read paths still see something useful.
          attribute_group: null,
          sub_attribute: tagInfo?.category ?? null,
          severity: polarity === "positive" ? "green" : "red",
        };
      })
      .filter((r) => r !== null);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For deep pass, replace previous deep rows for this (session, participant) so re-runs are idempotent.
    if (isDeep) {
      await supa
        .from("performance_annotations")
        .delete()
        .eq("session_id", body.session_id)
        .eq("session_kind", body.session_kind)
        .eq("participant_id", body.participant_id)
        .eq("pass_kind", "deep");
    }

    const { error: insErr } = await supa.from("performance_annotations").insert(rows);
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});