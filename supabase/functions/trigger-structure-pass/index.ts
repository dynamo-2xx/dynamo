// Fire-and-forget wrapper around analyze-structure so the client can return
// immediately and subscribe to argument_units realtime inserts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  session_id: string;
  session_kind: "debate" | "cmm" | "live" | "imported";
  pass_kind?: "structure_live" | "structure_final";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userSupa = createClient(SUPA_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userSupa.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth_required" }), { status: 401, headers: corsHeaders });

    const { session_id, session_kind, pass_kind = "structure_live" } = (await req.json()) as Body;
    if (!session_id || !session_kind) {
      return new Response(JSON.stringify({ error: "bad_payload" }), { status: 400, headers: corsHeaders });
    }

    const bgTask = fetch(`${SUPA_URL}/functions/v1/analyze-structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ session_id, session_kind, pass_kind }),
    })
      .then(async (r) => { try { await r.text(); } catch (_) {} })
      .catch((e) => { console.error("structure bg error", e); });
    // @ts-ignore EdgeRuntime is provided by Supabase edge runtime
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(bgTask); } catch (_) {}

    return new Response(JSON.stringify({ ok: true, queued: true, pass_kind }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trigger-structure-pass error", e);
    return new Response(JSON.stringify({ error: "trigger_failed", message: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});