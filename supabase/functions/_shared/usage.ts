// Shared usage logger for AI + speech calls. Writes directly to ai_usage_log /
// speech_usage_log using the service role, so callers don't need to hop
// through another edge function. Fire-and-forget: never throws.
//
// Pricing tables mirror supabase/functions/log-usage/index.ts so a single
// source of truth for cost estimates lives here long-term.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const AI_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro":         { input: 1.25,  output: 10.0 },
  "google/gemini-2.5-flash":       { input: 0.30,  output: 2.50 },
  "google/gemini-2.5-flash-lite":  { input: 0.10,  output: 0.40 },
  "google/gemini-3-flash-preview": { input: 0.30,  output: 2.50 },
  "google/gemini-3.1-pro-preview": { input: 1.50,  output: 12.0 },
  "openai/gpt-5":                  { input: 5.0,   output: 20.0 },
  "openai/gpt-5-mini":             { input: 0.50,  output: 2.0 },
  "openai/gpt-5-nano":             { input: 0.10,  output: 0.40 },
  "openai/gpt-5.2":                { input: 6.0,   output: 24.0 },
};
const DEFAULT_AI_PRICE = { input: 0.50, output: 2.0 };
const DEEPGRAM_PER_MIN_USD = 0.0043;

export function estimateAiCost(model: string, inTok: number, outTok: number): number {
  const p = AI_PRICING[model] || DEFAULT_AI_PRICE;
  return (inTok / 1_000_000) * p.input + (outTok / 1_000_000) * p.output;
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export type LogAiInput = {
  function_name: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  user_id?: string | null;
  session_id?: string | null;
};

/** Fire-and-forget AI usage log. Reads usage from the OpenAI-style response. */
export function logAiUsage(input: LogAiInput): void {
  const inTok = Number(input.usage?.prompt_tokens || 0);
  const outTok = Number(input.usage?.completion_tokens || 0);
  const cost = estimateAiCost(input.model, inTok, outTok);
  // Don't await — must not block the caller. Swallow errors.
  admin()
    .from("ai_usage_log")
    .insert({
      function_name: input.function_name,
      model: input.model,
      input_tokens: inTok,
      output_tokens: outTok,
      cost_usd: cost,
      user_id: input.user_id ?? null,
      session_id: input.session_id ?? null,
    })
    .then(({ error }: any) => {
      if (error) console.error("[usage] ai log failed:", error.message);
    })
    .catch((e: any) => console.error("[usage] ai log threw:", e));
}

export type LogSpeechInput = {
  minutes: number;
  user_id?: string | null;
  session_id?: string | null;
};

export function logSpeechUsage(input: LogSpeechInput): void {
  const cost = input.minutes * DEEPGRAM_PER_MIN_USD;
  admin()
    .from("speech_usage_log")
    .insert({
      minutes: input.minutes,
      cost_usd: cost,
      user_id: input.user_id ?? null,
      session_id: input.session_id ?? null,
    })
    .then(({ error }: any) => {
      if (error) console.error("[usage] speech log failed:", error.message);
    })
    .catch((e: any) => console.error("[usage] speech log threw:", e));
}