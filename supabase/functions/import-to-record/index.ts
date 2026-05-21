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
 * Import-to-record (rewritten): standalone imported_records table.
 * Output: { topic, subtopics[], transcript[], argument_map[] } — no sides/queues.
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

function structurePrompt(text: string, titleHint?: string) {
  return `You are restructuring source material into a neutral imported record (no sides, no debate framing).
Return STRICT JSON:
{
  "topic": string (max 12 words),
  "subtopics": string[] (2-4 angles, ordered),
  "transcript": Array<{ "subtopic_index": number, "speaker": string, "text": string }>,
  "argument_map": Array<{
    "subtopic_index": number,
    "speaker": string,
    "type": "claim"|"counter"|"stake"|"quote"|"evidence",
    "content": string,
    "quote": string|null,
    "parent_index": number|null
  }>
}
Title hint: ${titleHint ?? ""}
SOURCE:
${text.slice(0, 20000)}`;
}

async function structure(text: string, titleHint?: string) {
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
        { role: "user", content: structurePrompt(text, titleHint) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  return { parsed: repairAndParse(cleaned), usage: json.usage };
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

    // Daily soft cap — 20 imports/24h, counted off imported_records
    {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("imported_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
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
    let sourceKind: "url" | "text" | "pdf" | "media" | "article" = "text";

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
      sourceKind = "text";
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
      const { data: signed, error: signErr } = await admin.storage
        .from("imports")
        .createSignedUrl(body.storage_path, 60 * 30);
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

    const { parsed, usage } = await structure(text, body.title_hint);
    logAiUsage({
      function_name: "import-to-record",
      model: "google/gemini-2.5-flash",
      usage,
      user_id: user.id,
    });

    const title = String(parsed.topic ?? body.title_hint ?? "Imported record").slice(0, 240);
    const subtopicTitles: string[] = Array.isArray(parsed.subtopics) && parsed.subtopics.length
      ? parsed.subtopics.slice(0, 4).map((s: any) => String(s).slice(0, 200))
      : ["Main thread"];
    const subtopicsObj = subtopicTitles.map((t: string, i: number) => ({
      id: crypto.randomUUID(),
      title: t,
      sort_order: i,
    }));
    const titleByIndex = (i: number) =>
      subtopicsObj[Math.min(Math.max(Number(i) || 0, 0), subtopicsObj.length - 1)].title;

    const rawTranscript: any[] = Array.isArray(parsed.transcript) ? parsed.transcript : [];
    const transcript_entries = rawTranscript.map((t: any, i: number) => ({
      id: crypto.randomUUID(),
      speaker_side: String(t.speaker ?? "Speaker").slice(0, 120),
      text: String(t.text ?? "").slice(0, 4000),
      subtopic: titleByIndex(t.subtopic_index),
      timestamp: i,
    }));

    const rawMap: any[] = Array.isArray(parsed.argument_map) ? parsed.argument_map : [];
    const argument_map = rawMap.map((a: any, i: number) => ({
      id: crypto.randomUUID(),
      type: ["claim", "counter", "stake", "quote", "evidence"].includes(a.type) ? a.type : "claim",
      speaker_side: String(a.speaker ?? "Speaker").slice(0, 120),
      content: String(a.content ?? "").slice(0, 2000),
      quote: a.quote ? String(a.quote).slice(0, 1000) : undefined,
      parent_index: a.parent_index === null || a.parent_index === undefined ? undefined : Number(a.parent_index),
      subtopic: titleByIndex(a.subtopic_index),
      created_at: i,
    }));

    const { data: row, error: insErr } = await admin
      .from("imported_records")
      .insert({
        user_id: user.id,
        title,
        description: body.title_hint ?? null,
        source_kind: sourceKind,
        source_url: sourceUrl,
        subtopics: subtopicsObj,
        transcript_entries,
        argument_map,
        is_public: false,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    admin.rpc("increment_usage", { _user_id: user.id, _metric: "sessions_created" })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error("import quota inc failed", error.message);
      });

    return new Response(JSON.stringify({ imported_record_id: row.id }), {
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
