// §21 Performance Intelligence — auto-trigger the deep pass for the calling
// user on a completed debate. Idempotent: skips if annotations already exist
// for the (session, participant, pass=deep) tuple. Premium-only (analyze
// gate enforces 402 for free).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = { session_id: string; session_kind: "debate" | "live" | "cmm" | "imported" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userSupa = createClient(SUPA_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userSupa.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth_required" }), { status: 401, headers: corsHeaders });

    const { session_id, session_kind } = (await req.json()) as Body;
    if (!session_id || !session_kind) {
      return new Response(JSON.stringify({ error: "bad_payload" }), { status: 400, headers: corsHeaders });
    }

    const supa = createClient(SUPA_URL, SRK);
    // Note: analyze-performance is idempotent for deep pass (delete-then-insert),
    // so we no longer skip when prior rows exist. Re-runs replace prior deep rows.

    // Gather passages for the user.
    let passages: Array<{ transcript_entry_id?: string; text: string; subtopic_id?: string | null }> = [];
    if (session_kind === "debate" || session_kind === "cmm") {
      const { data: tr } = await supa
        .from("debate_transcripts")
        .select("transcript_entries")
        .eq("debate_id", session_id)
        .maybeSingle();
      const entries: any[] = Array.isArray((tr as any)?.transcript_entries) ? (tr as any).transcript_entries : [];
      passages = entries
        .filter((e) => e?.user_id === user.id && typeof e?.text === "string" && e.text.trim().length > 30)
        .map((e) => ({ transcript_entry_id: e?.id, text: String(e.text).slice(0, 2000), subtopic_id: e?.subtopic_id ?? null }));
    } else if (session_kind === "imported") {
      // imported_records own one transcript_entries jsonb array. Treat every
      // entry as belonging to the importing user (deep pass runs on the whole
      // imported transcript, regardless of detected speakers).
      const { data: rec } = await supa
        .from("imported_records")
        .select("user_id, transcript_entries")
        .eq("id", session_id)
        .maybeSingle();
      if (!rec || (rec as any).user_id !== user.id) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
      }
      const entries: any[] = Array.isArray((rec as any)?.transcript_entries) ? (rec as any).transcript_entries : [];
      passages = entries
        .filter((e) => typeof e?.text === "string" && e.text.trim().length > 30)
        .map((e) => ({ transcript_entry_id: e?.id, text: String(e.text).slice(0, 2000), subtopic_id: e?.subtopic_id ?? null }));
    } else {
      // live: read entries table (column is `user_id`, no subtopic_id)
      const { data: rows } = await supa
        .from("live_session_entries")
        .select("id, text, user_id")
        .eq("session_id", session_id)
        .eq("user_id", user.id);
      passages = (rows ?? [])
        .filter((r: any) => typeof r?.text === "string" && r.text.trim().length > 30)
        .map((r: any) => ({ transcript_entry_id: r.id, text: String(r.text).slice(0, 2000), subtopic_id: null }));
    }

    if (passages.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_passages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap to first 30 passages to control cost.
    passages = passages.slice(0, 30);

    // Fire-and-forget: Gemini Pro deep pass can exceed the 150s idle timeout.
    // Kick analyze-performance in the background and return 202 immediately.
    // The client subscribes to realtime annotation inserts to render results.
    const bgTask = fetch(`${SUPA_URL}/functions/v1/analyze-performance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        session_id, session_kind, participant_id: user.id, pass: "deep", passages,
      }),
    })
      .then(async (r) => { try { await r.text(); } catch (_) {} })
      .catch((e) => { console.error("deep-pass bg error", e); });
    // @ts-ignore EdgeRuntime is provided by Supabase edge runtime
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(bgTask); } catch (_) {}
    return new Response(JSON.stringify({ ok: true, queued: passages.length }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trigger-deep-perf error", e);
    return new Response(JSON.stringify({ error: "trigger_failed", message: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});