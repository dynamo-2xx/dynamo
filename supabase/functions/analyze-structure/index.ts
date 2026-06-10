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
          const rawSide = safeStr(e?.speaker_side ?? "", 40);
          const speakerLabel = safeStr(e?.speaker ?? rawSide ?? "Source", 60) || "Source";
          const sideLower = rawSide ? rawSide.toLowerCase() : "unknown";
          return {
            speaker: speakerLabel,
            side: sideLower,
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

    // Use plain JSON output instead of strict tool calling — gemini-3-flash-preview
    // rejects the deeply-nested tool schema with upstream_error. Reliable parse via
    // response_format: json_object and tolerant extraction below.
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + `\n\nReply with ONLY a single JSON object: { "units": [ ... ] }. No prose, no code fences.` },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
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
        model: "google/gemini-2.5-flash",
        usage: aiJson.usage,
        session_id,
      } as any);
    } catch (_) {}

    // Tolerant parse of message content.
    let parsed: any = null;
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try { parsed = JSON.parse(cleaned); } catch (_) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
    }

    const rawUnits: any[] = Array.isArray(parsed?.units) ? parsed.units : [];
    if (rawUnits.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, reason: "model_returned_no_units" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Second-sweep coverage pass --------------------------------------
    // If the first pass dropped too many substantive turns, ask the model to
    // place the missing turns onto existing threads. Pure filler is allowed to
    // stay dropped; the model returns { skipped: "filler", reason } for those.
    const FILLER_RE = /^(?:right|exactly|yeah|ok(?:ay)?|sure|thanks?|thank you|mm-?hmm|uh huh|next question|moving on|we'?ll come back to that)[\s.!,?]*$/i;
    const substantiveIdx = new Set<number>(
      passages
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.text.trim().length > 40 && !FILLER_RE.test(p.text.trim()))
        .map(({ i }) => i),
    );
    const coveredIdx = new Set<number>(
      rawUnits
        .map((u) => (Number.isInteger(u?.turn_index) ? u.turn_index : -1))
        .filter((i) => i >= 0),
    );
    const dropped = [...substantiveIdx].filter((i) => !coveredIdx.has(i));
    const coverage = substantiveIdx.size > 0 ? (substantiveIdx.size - dropped.length) / substantiveIdx.size : 1;

    let mergedUnits = rawUnits;
    if (coverage < 0.7 && dropped.length > 0) {
      // Build a compact anchor map so the model can extend the right thread.
      const anchors = rawUnits
        .filter((u) => String(u?.relationship_tag ?? "").toUpperCase() === "ANCHOR")
        .map((u) => `thread ${u.thread_id}: ${(u.relationship_note ?? u.source_text ?? "").toString().slice(0, 160)}`)
        .join("\n");
      const missingTurns = dropped
        .map((i) => {
          const p = passages[i];
          const sub = p.subtopic_title ? ` (subtopic: ${p.subtopic_title})` : "";
          return `[turn ${i}] ${p.speaker} [${p.side}]${sub}\n${p.text}`;
        })
        .join("\n\n");

      const sweepPrompt = systemPrompt +
        `\n\nSECOND-SWEEP MODE: The first pass dropped the turns below. For each, either (a) emit a unit that attaches to an EXISTING thread_id (do not invent new threads unless absolutely necessary), or (b) skip it if it is true filler. Reuse the thread_id labels from the anchor list. Reply with ONLY { "units": [...] }.`;
      const sweepUser = `EXISTING THREADS:\n${anchors}\n\nMISSING TURNS:\n${missingTurns}`;

      try {
        const sweepRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: sweepPrompt },
              { role: "user", content: sweepUser },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (sweepRes.ok) {
          const sweepJson = await sweepRes.json();
          try {
            const { logAiUsage } = await import("../_shared/usage.ts");
            logAiUsage({
              function_name: "analyze-structure",
              model: "google/gemini-2.5-flash",
              usage: sweepJson.usage,
              session_id,
              metadata: { pass: "second_sweep" },
            } as any);
          } catch (_) {}
          const sweepContent: string = sweepJson?.choices?.[0]?.message?.content ?? "{}";
          const sweepCleaned = sweepContent.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          let sweepParsed: any = null;
          try { sweepParsed = JSON.parse(sweepCleaned); } catch (_) {
            const m = sweepCleaned.match(/\{[\s\S]*\}/);
            if (m) { try { sweepParsed = JSON.parse(m[0]); } catch (_) {} }
          }
          const sweepUnits: any[] = Array.isArray(sweepParsed?.units) ? sweepParsed.units : [];
          if (sweepUnits.length > 0) {
            // Give second-sweep units unique unit_ids so the idMap doesn't collide.
            let counter = rawUnits.length + 1;
            for (const u of sweepUnits) {
              if (!u.unit_id || typeof u.unit_id !== "string") {
                u.unit_id = `s${counter++}`;
              } else if (rawUnits.some((r) => r.unit_id === u.unit_id)) {
                u.unit_id = `s${counter++}`;
              }
            }
            mergedUnits = [...rawUnits, ...sweepUnits];
          }
        }
      } catch (e) {
        console.warn("second-sweep failed (non-fatal)", e);
      }
    }
    // ----------------------------------------------------------------------

    // First pass: assign a stable uuid per unit_id so we can resolve relates_to refs.
    const idMap = new Map<string, string>();
    for (const u of mergedUnits) {
      const uid = String(u?.unit_id ?? "").trim();
      if (!uid) continue;
      if (!idMap.has(uid)) idMap.set(uid, crypto.randomUUID());
    }

    // Group threads + track which thread_ids exist so each gets exactly one anchor.
    const threadIdMap = new Map<string, string>();
    const threadAnchorSeen = new Set<string>();
    // Remember the last assigned uuid per thread so we can fall back to "previous
    // unit in the same thread" when the model hallucinates a relates_to ref.
    const lastUuidByThread = new Map<string, string>();

    const rows: any[] = [];
    for (const u of mergedUnits) {
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
      let relates_to: string | null;
      if (tag === "ANCHOR") {
        relates_to = null;
      } else if (typeof relatesRef === "string" && idMap.has(relatesRef)) {
        relates_to = idMap.get(relatesRef)!;
      } else {
        // Hallucinated or missing ref → fall back to the previous unit in this thread.
        relates_to = lastUuidByThread.get(threadKey) ?? null;
      }

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
      lastUuidByThread.set(threadKey, id);
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