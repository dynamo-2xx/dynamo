// Internal usage logger. Called by other edge functions (ai-facilitator,
// analyze-transcript, record-qa, consolidate-notebook, detect-cross-refs,
// deepgram-token) to record per-call AI/speech usage.
//
// This function is NOT meant to be called from the browser directly. It uses
// the service role to bypass RLS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rough USD pricing per 1M tokens / per minute. Adjust as providers change.
const AI_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro":         { input: 1.25,  output: 10.0 },
  "google/gemini-2.5-flash":       { input: 0.30,  output: 2.50 },
  "google/gemini-2.5-flash-lite":  { input: 0.10,  output: 0.40 },
  "openai/gpt-5":                  { input: 5.0,   output: 20.0 },
  "openai/gpt-5-mini":             { input: 0.50,  output: 2.0 },
  "openai/gpt-5-nano":             { input: 0.10,  output: 0.40 },
};
const DEFAULT_AI_PRICE = { input: 0.50, output: 2.0 };
const DEEPGRAM_PER_MIN_USD = 0.0043; // streaming nova-2

function estimateAiCost(model: string, inTok: number, outTok: number): number {
  const p = AI_PRICING[model] || DEFAULT_AI_PRICE;
  return (inTok / 1_000_000) * p.input + (outTok / 1_000_000) * p.output;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const kind = body.kind as "ai" | "speech";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (kind === "ai") {
      const input_tokens = Number(body.input_tokens || 0);
      const output_tokens = Number(body.output_tokens || 0);
      const model = String(body.model || "unknown");
      const cost_usd = body.cost_usd != null ? Number(body.cost_usd) : estimateAiCost(model, input_tokens, output_tokens);
      const { error } = await admin.from("ai_usage_log").insert({
        user_id: body.user_id ?? null,
        session_id: body.session_id ?? null,
        function_name: String(body.function_name || "unknown"),
        model,
        input_tokens,
        output_tokens,
        cost_usd,
      });
      if (error) throw error;
    } else if (kind === "speech") {
      const minutes = Number(body.minutes || 0);
      const cost_usd = body.cost_usd != null ? Number(body.cost_usd) : minutes * DEEPGRAM_PER_MIN_USD;
      const { error } = await admin.from("speech_usage_log").insert({
        user_id: body.user_id ?? null,
        session_id: body.session_id ?? null,
        minutes,
        cost_usd,
      });
      if (error) throw error;
    } else {
      return new Response(JSON.stringify({ error: "invalid kind" }), {
        status: 400,
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