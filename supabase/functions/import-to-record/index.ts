import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { logAiUsage } from "../_shared/usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * §25 Import — standalone 4th creation format.
 * Sources: url · text · pdf_upload · media_upload (audio/video via Deepgram).
 * Structures: debate · live · cmm.
 * Output: completed, private record in the chosen structure.
 */

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY") ?? "";

type Kind = "url" | "text" | "pdf_upload" | "media_upload";
type Structure = "debate" | "live" | "cmm";

type Body = {
  kind: Kind;
  structure?: Structure;
  source_url?: string;
  raw_text?: string;
  storage_path?: string;
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

async function transcribeWithDeepgram(mediaUrl: string): Promise<string> {
  if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY missing");
  const r = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true&paragraphs=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: mediaUrl }),
    },
  );
  if (!r.ok) throw new Error(`deepgram_${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const transcript = j?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript
    ?? j?.results?.channels?.[0]?.alternatives?.[0]?.transcript
    ?? "";
  return String(transcript).trim();
}

function structurePrompt(text: string, titleHint: string | undefined, structure: Structure) {
  if (structure === "cmm") {
    return `You are restructuring source material into a Change-My-Mind record.
Return STRICT JSON:
{
  "topic": string (max 12 words),
  "position": string (the central claim being defended, 1-2 sentences),
  "subtopics": string[] (2-4 angles of attack),
  "challengers": Array<{"subtopic_index": number, "speaker": string, "position_text": string}>
}
Title hint: ${titleHint ?? ""}
SOURCE:\n${text.slice(0, 20000)}`;
  }
  // debate + live share the same threaded shape
  return `You are restructuring source material into a clean record.
Return STRICT JSON:
{
  "topic": string (max 12 words),
  "subtopics": string[] (2-4),
  "sides": string[] (exactly 2),
  "threads": Array<{"side_index": 0|1, "subtopic_index": number, "speaker": string, "text": string}>,
  "key_arguments": Array<{"subtopic_index": number, "side_index": 0|1, "content": string}> (2-4 per subtopic per side)
}
Title hint: ${titleHint ?? ""}
SOURCE:\n${text.slice(0, 20000)}`;
}

async function structure(text: string, titleHint: string | undefined, structureKind: Structure) {
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
        { role: "user", content: structurePrompt(text, titleHint, structureKind) },
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
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const structureKind: Structure = body.structure ?? "debate";

    // Tier preflight
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier,status")
      .eq("user_id", user.id)
      .maybeSingle();
    const tier = (sub as { tier?: string } | null)?.tier ?? "free";
    if (tier === "free") {
      return new Response(JSON.stringify({
        error: "tier_required",
        message: "Importing is a Pro feature. Upgrade to import from links, transcripts, PDFs, or recordings.",
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Daily soft cap — 20 imports/24h
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

    // ----- Acquire text -----
    let text = "";
    let sourceUrl: string | null = null;
    let sourceKind = "text";

    if (body.kind === "url" && body.source_url) {
      sourceUrl = body.source_url;
      if (/(youtube\.com|youtu\.be)/i.test(body.source_url)) {
        return new Response(JSON.stringify({
          error: "source_kind_unsupported",
          message: "YouTube URLs aren't supported yet. Download the audio and upload it instead, or paste a direct .mp3/.mp4 link.",
        }), { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const r = await fetch(body.source_url, { headers: { "User-Agent": "DynamoBot/1.0" } });
      if (!r.ok) throw new Error(`fetch_failed_${r.status}`);
      const contentType = r.headers.get("content-type") ?? "";
      const isPdf = /\.pdf($|\?)/i.test(body.source_url) || contentType.includes("application/pdf");
      const isMedia = /audio\/|video\//i.test(contentType) || /\.(mp3|mp4|m4a|wav|webm|ogg|mov)($|\?)/i.test(body.source_url);
      if (isPdf) {
        sourceKind = "pdf";
        const buf = new Uint8Array(await r.arrayBuffer());
        const pdf = await getDocumentProxy(buf);
        const { text: pdfText } = await extractText(pdf, { mergePages: true });
        text = (Array.isArray(pdfText) ? pdfText.join("\n") : pdfText).replace(/\s+/g, " ").trim();
      } else if (isMedia) {
        sourceKind = "media";
        text = await transcribeWithDeepgram(body.source_url);
      } else {
        sourceKind = "article";
        text = stripHtml(await r.text());
      }
    } else if (body.kind === "text" && body.raw_text) {
      text = body.raw_text;
    } else if (body.kind === "pdf_upload" && body.storage_path) {
      sourceKind = "pdf";
      const { data: dl, error: dlErr } = await admin.storage.from("imports").download(body.storage_path);
      if (dlErr || !dl) throw new Error(`pdf_download_failed: ${dlErr?.message ?? "no data"}`);
      const buf = new Uint8Array(await dl.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text: pdfText } = await extractText(pdf, { mergePages: true });
      text = (Array.isArray(pdfText) ? pdfText.join("\n") : pdfText).replace(/\s+/g, " ").trim();
    } else if (body.kind === "media_upload" && body.storage_path) {
      sourceKind = "media";
      // Deepgram needs a public-ish URL; create a short-lived signed URL.
      const { data: signed, error: signErr } = await admin.storage
        .from("imports")
        .createSignedUrl(body.storage_path, 60 * 30); // 30 min
      if (signErr || !signed?.signedUrl) throw new Error(`sign_url_failed: ${signErr?.message ?? "no url"}`);
      text = await transcribeWithDeepgram(signed.signedUrl);
    } else {
      return new Response(JSON.stringify({ error: "bad_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length < 200) {
      return new Response(JSON.stringify({
        error: "source_too_short",
        message: "Source produced too little text to structure (need ~200+ chars).",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { parsed: structured, usage } = await structure(text, body.title_hint, structureKind);
    logAiUsage({
      function_name: "import-to-record",
      model: "google/gemini-2.5-flash",
      usage,
      user_id: user.id,
    });

    const topic = String(structured.topic ?? body.title_hint ?? "Imported record").slice(0, 240);

    // =============== STRUCTURE BRANCH ===============
    if (structureKind === "live") {
      // Single-row live_sessions: jsonb transcript_entries + summaries + subtopics
      const subs: string[] = Array.isArray(structured.subtopics) && structured.subtopics.length
        ? structured.subtopics.slice(0, 4) : ["Main thread"];
      const subsObj = subs.map((title: string, i: number) => ({
        id: crypto.randomUUID(),
        title,
        sort_order: i,
      }));
      const threads: any[] = Array.isArray(structured.threads) ? structured.threads : [];
      const entries = threads.map((t: any, i: number) => ({
        id: crypto.randomUUID(),
        order: i,
        subtopic_id: subsObj[Math.min(Number(t.subtopic_index) || 0, subsObj.length - 1)].id,
        speaker_name: String(t.speaker ?? "Speaker").slice(0, 120),
        text: String(t.text ?? "").slice(0, 4000),
        created_at: new Date(Date.now() + i).toISOString(),
      }));
      const summaries = (Array.isArray(structured.key_arguments) ? structured.key_arguments : [])
        .map((k: any) => ({
          subtopic_id: subsObj[Math.min(Number(k.subtopic_index) || 0, subsObj.length - 1)].id,
          side: Number(k.side_index) === 1 ? "Side B" : "Side A",
          content: String(k.content ?? "").slice(0, 600),
        }));

      const { data: liveRow, error: liveErr } = await admin.from("live_sessions").insert({
        created_by: user.id,
        title: topic,
        mode: "single_device",
        status: "ended",
        ended_at: new Date().toISOString(),
        transcript_entries: entries,
        summaries,
        subtopics: subsObj,
      } as any).select("id").single();
      if (liveErr) throw liveErr;

      return new Response(JSON.stringify({ live_session_id: liveRow.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- debate + cmm both write to debates table -----
    const isCmm = structureKind === "cmm";
    const { data: debate, error: insErr } = await admin
      .from("debates")
      .insert({
        topic,
        created_by: user.id,
        is_public: false,
        status: "completed",
        ended_at: new Date().toISOString(),
        facilitator_type: "ai",
        feedback_enabled: false,
        format: isCmm ? "change_my_mind" : "standard",
        imported_source_url: sourceUrl,
        imported_source_kind: sourceKind,
        description: isCmm ? (structured.position ?? body.title_hint ?? null) : (body.title_hint ?? null),
      } as any)
      .select("id")
      .single();
    if (insErr) throw insErr;
    const debateId = debate.id as string;

    // Count toward monthly quota (fire-and-forget)
    admin.rpc("increment_usage", { _user_id: user.id, _metric: "sessions_created" })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error("import quota inc failed", error.message);
      });

    // Subtopics
    const subs: string[] = Array.isArray(structured.subtopics) && structured.subtopics.length
      ? structured.subtopics.slice(0, 4) : ["Main thread"];
    const { data: subtopicRows } = await admin.from("debate_subtopics").insert(
      subs.map((title: string, i: number) => ({ debate_id: debateId, title, sort_order: i })),
    ).select("id, sort_order");

    if (isCmm) {
      // CMM: insert the queue (challengers). No sides/transcripts/round_summaries needed —
      // the CMM page renders from cmm_queue + debate.description (the position).
      const subById = (idx: number) =>
        subtopicRows?.find((s: { sort_order: number; id: string }) => s.sort_order === idx)?.id ?? null;
      const challengers: any[] = Array.isArray(structured.challengers) ? structured.challengers : [];
      if (challengers.length > 0) {
        await admin.from("cmm_queue").insert(
          challengers.map((c: any, i: number) => ({
            debate_id: debateId,
            user_id: user.id, // imported challengers attributed to importer
            position_text: String(c.position_text ?? "").slice(0, 2000),
            preferred_subtopic_id: subById(Number(c.subtopic_index) || 0),
            status: "completed",
            queue_index: i,
            ended_at: new Date().toISOString(),
          })),
        );
      }
      return new Response(JSON.stringify({ debate_id: debateId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- DEBATE structure -----
    const sideLabels: string[] = Array.isArray(structured.sides) && structured.sides.length === 2
      ? structured.sides : ["For", "Against"];
    const { data: sideRows } = await admin.from("debate_sides").insert(
      sideLabels.map((label: string, i: number) => ({ debate_id: debateId, label, sort_order: i })),
    ).select("id, sort_order");

    const sideById = (idx: number) =>
      sideRows?.find((s: { sort_order: number; id: string }) => s.sort_order === idx)?.id ?? null;
    const subById = (idx: number) =>
      subtopicRows?.find((s: { sort_order: number; id: string }) => s.sort_order === idx)?.id ?? null;

    // Transcript entries (chronological flat list)
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
    await admin.from("debate_transcripts").insert({
      debate_id: debateId,
      transcript_entries: entries,
      argument_map: { nodes: [], imported: true },
    } as any);

    // ----- round_summaries (this fixes "Summaries pending") -----
    const keyArgs: any[] = Array.isArray(structured.key_arguments) ? structured.key_arguments : [];
    if (keyArgs.length > 0) {
      // Group by subtopic_index → { summary?: text, key_arguments: [{side, content}, ...] }
      const grouped = new Map<number, { side: string; content: string }[]>();
      keyArgs.forEach((k) => {
        const idx = Number(k.subtopic_index) || 0;
        const arr = grouped.get(idx) ?? [];
        const sideLabel = sideLabels[Number(k.side_index) === 1 ? 1 : 0];
        arr.push({ side: sideLabel, content: String(k.content ?? "").slice(0, 600) });
        grouped.set(idx, arr);
      });
      const rows: any[] = [];
      for (const [idx, items] of grouped.entries()) {
        const subId = subById(idx);
        if (!subId) continue;
        rows.push({
          debate_id: debateId,
          subtopic_id: subId,
          summary: `Imported thread for "${subs[idx] ?? "Subtopic"}".`,
          key_arguments: items,
        });
      }
      if (rows.length > 0) await admin.from("round_summaries").insert(rows);
    }

    return new Response(JSON.stringify({ debate_id: debateId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-to-record error:", e);
    return new Response(JSON.stringify({ error: "import_failed", message: String((e as { message?: string })?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});