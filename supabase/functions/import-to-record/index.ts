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
 * Import-to-record: insert a placeholder row immediately, return its id,
 * then process in the background while the page subscribes to row updates.
 *
 * Stages (progress jsonb):
 *   fetching   → 5..25   (download / pdf / deepgram)
 *   outlining  → 25..40  (model produces topic + nested subtopics)
 *   structuring→ 40..85  (chunked transcript + argument map assembly)
 *   threading  → 85..95  (analyze-structure → argument_units)
 *   done       → 100     (status flips to "ready")
 */

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY") ?? "";

type Kind = "url" | "text" | "pdf_upload" | "media_upload";

type Body = {
  kind: Kind;
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
  return String(
    j?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript
      ?? j?.results?.channels?.[0]?.alternatives?.[0]?.transcript
      ?? "",
  ).trim();
}

/* ---------- helpers: chunking + AI calls ---------- */

/** Split text into ~targetChars windows at sentence boundaries. */
function chunkText(text: string, target = 12000): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= target) return [clean];
  const sentences = clean.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur.length + s.length > target && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function callGateway(body: any, label: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ai_gateway_${res.status}_${label}: ${(await res.text()).slice(0, 300)}`);
  return await res.json();
}

/** Phase A — produce nested outline (topic + 2 levels of subtopics). */
async function outlineSource(text: string, titleHint?: string) {
  const sample = text.length > 14000
    ? text.slice(0, 7000) + "\n…[middle elided]…\n" + text.slice(-7000)
    : text;
  const json = await callGateway({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: "You read source material and produce a neutral outline. Reply ONLY with valid JSON matching the schema described in the user message." },
      { role: "user", content: `Source title hint: ${titleHint ?? "(none)"}

Produce a JSON object:
{
  "topic": "≤ 12 word neutral title",
  "subtopics": [
    { "title": "Top-level subtopic title (≤ 8 words)",
      "subtopics": [ { "title": "Optional sub-subtopic (≤ 8 words)" }, ... up to 4 ]
    }, ... 1 to 4 top-level
  ]
}

Rules:
- 1 to 4 top-level subtopics.
- Break a top-level subtopic into nested sub-subtopics ONLY when the source clearly covers multiple distinct angles inside it. If not, omit "subtopics" or leave it empty.
- Maximum 2 levels of nesting (no sub-sub-sub).
- Subtopic titles must be neutral and source-faithful (no debate framing).

SOURCE:
${sample}` },
    ],
    response_format: { type: "json_object" },
  }, "outline");
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return { parsed: repairAndParse(content), usage: json.usage };
}

/** Phase B — for one chunk, assign turns + argument units to a given flat outline. */
async function structureChunk(
  chunk: string,
  flatSubtopics: Array<{ index: number; title: string; parent_title?: string }>,
  partIdx: number,
  partCount: number,
) {
  const outlineText = flatSubtopics
    .map((s) => s.parent_title
      ? `${s.index}. ${s.parent_title} › ${s.title}`
      : `${s.index}. ${s.title}`)
    .join("\n");
  const json = await callGateway({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: "You restructure source material into a neutral transcript and argument map. Reply ONLY with valid JSON matching the user-provided schema. Preserve every substantive turn; do not abridge speakers." },
      { role: "user", content: `This is part ${partIdx + 1} of ${partCount} of a longer source. Preserve the full content of THIS part — do not summarize away substantive turns. Each "text" entry may be up to 1500 characters. Quotes should remain verbatim.

OUTLINE (use these indices exactly):
${outlineText}

Return JSON:
{
  "transcript": [
    { "subtopic_index": <int from outline>, "speaker": "<name or role>", "text": "<verbatim or near-verbatim utterance, ≤ 1500 chars>" }
  ],
  "argument_map": [
    { "subtopic_index": <int from outline>, "speaker": "<name>", "type": "claim|counter|stake|quote|evidence",
      "content": "<≤ 500 chars>", "quote": "<short verbatim quote or null>", "parent_index": <int index into THIS array, or null> }
  ]
}

Aim for fidelity. For this part, emit as many transcript entries as the content requires (typically 8–40 for a ~12k char chunk).

SOURCE PART ${partIdx + 1}/${partCount}:
${chunk}` },
    ],
    response_format: { type: "json_object" },
  }, `chunk_${partIdx}`);
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return { parsed: repairAndParse(content), usage: json.usage };
}

function fallbackImportedRecord(text: string, titleHint?: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const sentenceMatches = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized];
  const sentences = sentenceMatches.map((s) => s.trim()).filter((s) => s.length > 20);
  const title = titleHint?.trim()
    || sentences[0]?.split(/\s+/).slice(0, 12).join(" ")
    || "Imported record";
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences.slice(0, 80)) {
    if (current && current.length + sentence.length > 700) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
    if (chunks.length >= 28) break;
  }
  if (current && chunks.length < 28) chunks.push(current.trim());
  const safeChunks = chunks.length ? chunks : [normalized.slice(0, 700)];
  return {
    topic: title.slice(0, 240),
    subtopics: ["Main thread"],
    transcript: safeChunks.map((chunk) => ({
      subtopic_index: 0,
      speaker: "Source",
      text: chunk,
    })),
    argument_map: safeChunks.slice(0, 12).map((chunk, i) => ({
      subtopic_index: 0,
      speaker: "Source",
      type: i === 0 ? "claim" : "evidence",
      content: chunk.slice(0, 500),
      quote: null,
      parent_index: i === 0 ? null : 0,
    })),
  };
}

function repairAndParse(raw: string): any {
  try { return JSON.parse(raw); } catch (_) {}
  // Extract JSON object substring
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  let s = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  // Strip control characters
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  // Remove trailing commas
  s = s.replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(s); } catch (_) {}
  // Escape raw newlines/tabs/CR that appear inside string literals
  // (invalid in JSON; common LLM mistake that produces
  // "Expected ',' or '}' after property value").
  {
    let out = "", inStr = false, esc = false;
    for (const ch of s) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = !inStr; out += ch; continue; }
      if (inStr && ch === "\n") { out += "\\n"; continue; }
      if (inStr && ch === "\r") { out += "\\r"; continue; }
      if (inStr && ch === "\t") { out += "\\t"; continue; }
      out += ch;
    }
    s = out;
  }
  try { return JSON.parse(s); } catch (_) {}
  // Balance brackets/braces inside strings-awareness
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  if (inStr) s += '"';
  while (brackets-- > 0) s += "]";
  while (braces-- > 0) s += "}";
  return JSON.parse(s);
}

/* ---------- progress helper ---------- */

function progressBody(stage: string, percent: number, message?: string) {
  return { stage, percent: Math.max(0, Math.min(100, Math.round(percent))), ...(message ? { message } : {}) };
}

async function setProgress(admin: any, id: string, stage: string, percent: number, message?: string) {
  try {
    await admin.from("imported_records").update({
      progress: progressBody(stage, percent, message),
    }).eq("id", id);
  } catch (e) {
    console.error("setProgress failed", e);
  }
}

/* ---------- background pipeline ---------- */

async function runPipeline(
  admin: any,
  authHeader: string,
  recordId: string,
  userId: string,
  body: Body,
) {
  try {
    // ----- 1) Acquire text -----
    await setProgress(admin, recordId, "fetching", 8);
    let text = "";
    let sourceUrl: string | null = null;
    let sourceKind: "url" | "text" | "pdf" | "media" | "article" = "text";

    if (body.kind === "url" && body.source_url) {
      sourceUrl = body.source_url;
      const r = await fetch(body.source_url, { headers: { "User-Agent": "DynamoBot/1.0" } });
      if (!r.ok) throw new Error(`fetch_failed_${r.status}`);
      const ct = r.headers.get("content-type") ?? "";
      const isPdf = /\.pdf($|\?)/i.test(body.source_url) || ct.includes("application/pdf");
      const isMedia = /audio\/|video\//i.test(ct) || /\.(mp3|mp4|m4a|wav|webm|ogg|mov)($|\?)/i.test(body.source_url);
      if (isPdf) {
        sourceKind = "pdf";
        const buf = new Uint8Array(await r.arrayBuffer());
        const pdf = await getDocumentProxy(buf);
        const { text: pdfText } = await extractText(pdf, { mergePages: true });
        text = (Array.isArray(pdfText) ? pdfText.join("\n") : pdfText).replace(/\s+/g, " ").trim();
      } else if (isMedia) {
        sourceKind = "media";
        await setProgress(admin, recordId, "transcribing", 15, "Transcribing audio");
        text = await transcribeWithDeepgram(body.source_url);
      } else {
        sourceKind = "article";
        text = stripHtml(await r.text());
      }
    } else if (body.kind === "text" && body.raw_text) {
      sourceKind = "text";
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
      await setProgress(admin, recordId, "transcribing", 15, "Transcribing audio");
      const { data: signed, error: signErr } = await admin.storage
        .from("imports").createSignedUrl(body.storage_path, 60 * 30);
      if (signErr || !signed?.signedUrl) throw new Error(`sign_url_failed: ${signErr?.message ?? "no url"}`);
      text = await transcribeWithDeepgram(signed.signedUrl);
    }

    if (text.length < 200) throw new Error("source_too_short");

    // Persist source kind / url early
    await admin.from("imported_records").update({
      source_kind: sourceKind,
      source_url: sourceUrl,
    }).eq("id", recordId);

    // ----- 2) Outline (topic + nested subtopics) -----
    await setProgress(admin, recordId, "outlining", 28, "Identifying topic and subtopics");
    const outline = await outlineSource(text, body.title_hint);
    logAiUsage({ function_name: "import-to-record:outline", model: "google/gemini-2.5-flash", usage: outline.usage, user_id: userId });

    const topic = String(outline.parsed?.topic ?? body.title_hint ?? "Imported record").slice(0, 240);
    type OutlineNode = { title: string; subtopics?: OutlineNode[] };
    const rawTops: OutlineNode[] = Array.isArray(outline.parsed?.subtopics) ? outline.parsed.subtopics : [];
    // Flatten DFS with parent linkage. Cap 4 tops × 4 children.
    const flat: Array<{ id: string; title: string; parent_id: string | null; sort_order: number }> = [];
    const flatForModel: Array<{ index: number; title: string; parent_title?: string }> = [];
    let order = 0;
    const safeTops = (rawTops.length ? rawTops : [{ title: "Main thread" }]).slice(0, 4);
    for (const top of safeTops) {
      const topTitle = String(top?.title ?? "Section").slice(0, 200) || "Section";
      const topId = crypto.randomUUID();
      flat.push({ id: topId, title: topTitle, parent_id: null, sort_order: order });
      flatForModel.push({ index: order, title: topTitle });
      order++;
      const children = Array.isArray(top?.subtopics) ? top.subtopics.slice(0, 4) : [];
      for (const ch of children) {
        const chTitle = String(ch?.title ?? "").slice(0, 200);
        if (!chTitle) continue;
        const chId = crypto.randomUUID();
        flat.push({ id: chId, title: chTitle, parent_id: topId, sort_order: order });
        flatForModel.push({ index: order, title: chTitle, parent_title: topTitle });
        order++;
      }
    }
    const subtopicsObj = flat;
    const titleByIndex = (i: number) => {
      const idx = Math.max(0, Math.min(flatForModel.length - 1, Number(i) || 0));
      return flatForModel[idx]?.title ?? flatForModel[0].title;
    };

    await admin.from("imported_records").update({
      title: topic,
      subtopics: subtopicsObj,
    }).eq("id", recordId);

    // ----- 3) Chunked structuring -----
    const chunks = chunkText(text, 12000);
    const allTranscript: any[] = [];
    const allMap: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const pct = 40 + Math.round(((i) / chunks.length) * 45); // 40..85
      await setProgress(admin, recordId, "structuring", pct,
        `Building transcript (part ${i + 1} of ${chunks.length})`);
      let parsed: any = null;
      try {
        const r = await structureChunk(chunks[i], flatForModel, i, chunks.length);
        logAiUsage({ function_name: "import-to-record:chunk", model: "google/gemini-2.5-flash", usage: r.usage, user_id: userId });
        parsed = r.parsed;
      } catch (e) {
        console.error(`chunk ${i} failed, skipping:`, (e as any)?.message ?? e);
        continue;
      }
      const offset = allMap.length;
      const rawTr: any[] = Array.isArray(parsed?.transcript) ? parsed.transcript : [];
      const rawMap: any[] = Array.isArray(parsed?.argument_map) ? parsed.argument_map : [];
      for (const t of rawTr) {
        allTranscript.push({
          id: crypto.randomUUID(),
          speaker_side: String(t?.speaker ?? "Speaker").slice(0, 120),
          text: String(t?.text ?? "").slice(0, 4000),
          subtopic: titleByIndex(t?.subtopic_index),
          timestamp: allTranscript.length,
        });
      }
      for (const a of rawMap) {
        const parent = a?.parent_index === null || a?.parent_index === undefined
          ? undefined
          : Number(a.parent_index) + offset;
        allMap.push({
          id: crypto.randomUUID(),
          type: ["claim", "counter", "stake", "quote", "evidence"].includes(a?.type) ? a.type : "claim",
          speaker_side: String(a?.speaker ?? "Speaker").slice(0, 120),
          content: String(a?.content ?? "").slice(0, 2000),
          quote: a?.quote ? String(a.quote).slice(0, 1000) : undefined,
          parent_index: parent,
          subtopic: titleByIndex(a?.subtopic_index),
          created_at: allMap.length,
        });
      }
      // Persist incrementally so the user can read the transcript as it grows.
      await admin.from("imported_records").update({
        transcript_entries: allTranscript,
        argument_map: allMap,
      }).eq("id", recordId);
    }

    if (allTranscript.length === 0) {
      // Fall back to coarse chunks so the page is not empty.
      const fb = fallbackImportedRecord(text, body.title_hint);
      await admin.from("imported_records").update({
        transcript_entries: fb.transcript.map((t: any, idx: number) => ({
          id: crypto.randomUUID(),
          speaker_side: t.speaker, text: t.text,
          subtopic: flat[0].title, timestamp: idx,
        })),
      }).eq("id", recordId);
    }

    // ----- 4) Threaded record (argument_units) -----
    await setProgress(admin, recordId, "threading", 88, "Mapping argument threads");
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/analyze-structure`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ session_id: recordId, session_kind: "imported", pass_kind: "structure_final" }),
      }).then((r) => r.text());
    } catch (e) { console.error("analyze-structure call failed", e); }

    // ----- 5) Done. Insights (annotations) populate live via realtime. -----
    await admin.from("imported_records").update({
      status: "ready",
      progress: progressBody("done", 100),
    }).eq("id", recordId);

    // Kick deep-perf for the owner (fire-and-forget).
    fetch(`${SUPABASE_URL}/functions/v1/trigger-deep-perf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ session_id: recordId, session_kind: "imported" }),
    }).catch(() => {});
  } catch (e) {
    console.error("import pipeline failed", e);
    await admin.from("imported_records").update({
      status: "failed",
      progress: progressBody("failed", 100, String((e as any)?.message ?? e).slice(0, 300)),
    }).eq("id", recordId);
  }
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

    if (body.kind === "url" && body.source_url && /(youtube\.com|youtu\.be)/i.test(body.source_url)) {
      return new Response(JSON.stringify({
        error: "source_kind_unsupported",
        message: "YouTube URLs aren't supported yet. Upload the audio file instead.",
      }), { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Tier preflight
    const { data: sub } = await supabase
      .from("subscriptions").select("tier,status").eq("user_id", user.id).maybeSingle();
    const tier = (sub as { tier?: string } | null)?.tier ?? "free";
    if (tier === "free") {
      return new Response(JSON.stringify({
        error: "tier_required",
        message: "Importing is a Pro feature. Upgrade to import from links, transcripts, PDFs, or recordings.",
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Daily cap
    {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("imported_records").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", since);
      if ((count ?? 0) >= 20) {
        return new Response(JSON.stringify({
          error: "daily_cap_reached",
          message: "You've hit today's import limit (20/day). Try again tomorrow.",
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Insert placeholder row immediately so the user can navigate to it.
    const placeholderKind: "url" | "text" | "pdf" | "media" | "article" =
      body.kind === "url" ? "url"
      : body.kind === "pdf_upload" ? "pdf"
      : body.kind === "media_upload" ? "media"
      : "text";
    const placeholderTitle = (body.title_hint ?? "Importing…").slice(0, 240);
    const { data: row, error: insErr } = await admin
      .from("imported_records")
      .insert({
        user_id: user.id,
        title: placeholderTitle,
        description: body.title_hint ?? null,
        source_kind: placeholderKind,
        source_url: body.kind === "url" ? body.source_url ?? null : null,
        subtopics: [],
        transcript_entries: [],
        argument_map: [],
        is_public: false,
        status: "processing",
        progress: progressBody("fetching", 3, "Starting…"),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    admin.rpc("increment_usage", { _user_id: user.id, _metric: "sessions_created" })
      .then(({ error }: { error: any }) => { if (error) console.error("import quota inc failed", error.message); });

    // Kick the pipeline in the background; respond immediately.
    const bg = runPipeline(admin, authHeader, row.id, user.id, body);
    // @ts-ignore EdgeRuntime is provided by Supabase edge runtime
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(bg); } catch (_) {}

    return new Response(JSON.stringify({ imported_record_id: row.id, status: "processing" }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-to-record error:", e);
    return new Response(JSON.stringify({
      error: "import_failed",
      message: String((e as { message?: string })?.message ?? e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
