// Structural analysis pass for the Threaded Record tab.
// Reads the transcript for a session (debate, cmm, live, or imported),
// asks Gemini Flash to assemble argument units with Toulmin anatomy +
// relationship tags, and writes them to public.argument_units.
//
// Idempotent: delete-then-insert scoped by (session_id, session_kind, pass_kind).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildStructurePrompt,
  buildStructureTool,
  RELATIONSHIP_TAGS,
} from "../_shared/structure-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  session_id: string;
  session_kind: "debate" | "cmm" | "live" | "imported";
  /** "structure_final" enables UNRESOLVED + replaces all prior units. */
  pass_kind?: "structure_live" | "structure_final";
};

const TAG_SET = new Set<string>(RELATIONSHIP_TAGS);

function safeStr(v: unknown, max = 2000): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "ai_unavailable" }), { status: 500, headers: corsHeaders });
    }

    const body = (await req.json()) as Body;
    const session_id = body?.session_id;
    const session_kind = body?.session_kind;
    const pass_kind = body?.pass_kind ?? "structure_live";
    if (!session_id || !session_kind) {
      return new Response(JSON.stringify({ error: "bad_payload" }), { status: 400, headers: corsHeaders });
    }

    const supa = createClient(SUPA_URL, SRK);

    // Gather a normalized passage list with speaker + subtopic context.
    type Passage = { speaker: string; side: string; subtopic_title: string | null; text: string };
    let passages: Passage[] = [];

    if (session_kind === "debate" || session_kind === "cmm") {
      const { data: tr } = await supa
        .from("debate_transcripts")
        .select("transcript_entries")
        .eq("debate_id", session_id)
        .maybeSingle();
      const entries: any[] = Array.isArray((tr as any)?.transcript_entries) ? (tr as any).transcript_entries : [];
      // Resolve subtopic titles.
      const { data: subs } = await supa
        .from("debate_subtopics")
        .select("id,title")
        .eq("debate_id", session_id);
      const subTitle = new Map<string, string>((subs ?? []).map((s: any) => [s.id, s.title]));
      passages = entries
        .filter((e) => typeof e?.text === "string" && e.text.trim().length > 20)
        .map((e) => ({
          speaker: safeStr(e?.speaker_name ?? e?.speaker_label ?? e?.side ?? "Speaker", 60),
          side: safeStr(e?.side ?? "unknown", 40),
          subtopic_title: e?.subtopic_id ? subTitle.get(e.subtopic_id) ?? null : (e?.subtopic ?? null),
          text: safeStr(e.text, 1500),
        }));
    } else if (session_kind === "imported") {
      const { data: rec } = await supa
        .from("imported_records")
        .select("transcript_entries, subtopics")
        .eq("id", session_id)
        .maybeSingle();
      const entries: any[] = Array.isArray((rec as any)?.transcript_entries) ? (rec as any).transcript_entries : [];
      const subList: any[] = Array.isArray((rec as any)?.subtopics) ? (rec as any).subtopics : [];
      passages = entries
        .filter((e) => typeof e?.text === "string" && e.text.trim().length > 20)
        .map((e) => {
          const subIdx = Number.isInteger(e?.subtopic_index) ? e.subtopic_index : null;
          const subTitle = subIdx !== null && subList[subIdx] ? String(subList[subIdx]) : (e?.subtopic ?? null);
          return {
            speaker: safeStr(e?.speaker ?? "Source", 60),
            side: "neutral",
            subtopic_title: subTitle,
            text: safeStr(e.text, 1500),
          };
        });
    } else {
      // live
      const { data: rows } = await supa
        .from("live_session_entries")
        .select("id, text, speaker_label, created_at")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true });
      passages = (rows ?? [])
        .filter((r: any) => typeof r?.text === "string" && r.text.trim().length > 20)
        .map((r: any) => ({
          speaker: safeStr(r?.speaker_label ?? "Speaker", 60),
          side: "neutral",
          subtopic_title: null,
          text: safeStr(r.text, 1500),
        }));
    }

    if (passages.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_passages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap input size for the timeout budget.
    passages = passages.slice(0, 80);

    const userMsg = passages
      .map((p, i) => {
        const sub = p.subtopic_title ? ` (subtopic: ${p.subtopic_title})` : "";
        return `[turn ${i}] ${p.speaker} [${p.side}]${sub}\n${p.text}`;
      })
      .join("\n\n");

    const allowUnresolved = pass_kind === "structure_final";
    const systemPrompt = buildStructurePrompt({ allowUnresolved });
    const tool = buildStructureTool(allowUnresolved);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_argument_structure" } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: corsHeaders });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("ai gateway error", aiRes.status, errText);
      return new Response(JSON.stringify({ error: `ai_${aiRes.status}` }), { status: 500, headers: corsHeaders });
    }

    const aiJson = await aiRes.json();
    try {
      const { logAiUsage } = await import("../_shared/usage.ts");
      logAiUsage({
        function_name: "analyze-structure",
        model: "google/gemini-3-flash-preview",
        usage: aiJson.usage,
        session_id,
      } as any);
    } catch (_) {}

    // Tool-call result first; fallback to message content parse.
    let parsed: any = null;
    const toolCalls = aiJson?.choices?.[0]?.message?.tool_calls;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      try { parsed = JSON.parse(toolCalls[0]?.function?.arguments ?? "{}"); } catch (_) {}
    }
    if (!parsed) {
      const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
      try { parsed = JSON.parse(content); } catch (_) {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
      }
    }

    const rawUnits: any[] = Array.isArray(parsed?.units) ? parsed.units : [];
    if (rawUnits.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, reason: "model_returned_no_units" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First pass: assign a stable uuid per unit_id so we can resolve relates_to refs.
    const idMap = new Map<string, string>();
    for (const u of rawUnits) {
      const uid = String(u?.unit_id ?? "").trim();
      if (!uid) continue;
      if (!idMap.has(uid)) idMap.set(uid, crypto.randomUUID());
    }

    // Group threads + track which thread_ids exist so each gets exactly one anchor.
    const threadIdMap = new Map<string, string>();
    const threadAnchorSeen = new Set<string>();

    const rows: any[] = [];
    for (const u of rawUnits) {
      const uid = String(u?.unit_id ?? "").trim();
      const id = idMap.get(uid);
      if (!id) continue;

      const threadKey = String(u?.thread_id ?? "t?").trim() || "t?";
      if (!threadIdMap.has(threadKey)) threadIdMap.set(threadKey, crypto.randomUUID());
      const thread_id = threadIdMap.get(threadKey)!;

      let tag = String(u?.relationship_tag ?? "").trim().toUpperCase();
      if (!TAG_SET.has(tag)) tag = "SUPPORT";
      // UNRESOLVED only in final pass.
      if (tag === "UNRESOLVED" && pass_kind !== "structure_final") tag = "PIVOT";
      // Force exactly one anchor per thread.
      if (tag === "ANCHOR") {
        if (threadAnchorSeen.has(threadKey)) tag = "SUPPORT";
        else threadAnchorSeen.add(threadKey);
      } else if (!threadAnchorSeen.has(threadKey)) {
        // First unit in a thread must be ANCHOR.
        tag = "ANCHOR";
        threadAnchorSeen.add(threadKey);
      }

      const relatesRef = u?.relates_to;
      const relates_to = tag === "ANCHOR"
        ? null
        : (typeof relatesRef === "string" && idMap.has(relatesRef) ? idMap.get(relatesRef)! : null);

      const anatomy = Array.isArray(u?.anatomy)
        ? u.anatomy
            .filter((p: any) => p && typeof p === "object" && typeof p.part === "string")
            .map((p: any) => ({
              part: String(p.part).toUpperCase(),
              text: safeStr(p.text ?? "", 800),
              note: typeof p.note === "string" ? p.note.slice(0, 300) : undefined,
            }))
        : [];

      rows.push({
        id,
        session_id,
        session_kind,
        subtopic_id: null,
        subtopic_title: typeof u?.subtopic_title === "string" ? u.subtopic_title.slice(0, 200) : null,
        thread_id,
        turn_index: Number.isInteger(u?.turn_index) ? u.turn_index : 0,
        speaker_label: safeStr(u?.speaker_label ?? "", 120) || null,
        speaker_side: safeStr(u?.speaker_side ?? "", 60) || null,
        source_text: safeStr(u?.source_text ?? "", 2000),
        anatomy,
        relationship_tag: tag,
        relates_to,
        relationship_note: safeStr(u?.relationship_note ?? "", 500) || null,
        is_standalone_concession: !!u?.is_standalone_concession,
        pass_kind,
      });
    }

    // Idempotent replace: clear all prior units for this (session, session_kind).
    // The structural product is one coherent snapshot per pass; the latest pass wins.
    await supa
      .from("argument_units")
      .delete()
      .eq("session_id", session_id)
      .eq("session_kind", session_kind);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await supa.from("argument_units").insert(rows);
    if (insErr) {
      console.error("argument_units insert error", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ inserted: rows.length, pass_kind }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-structure error", e);
    return new Response(JSON.stringify({ error: "structure_failed", message: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});