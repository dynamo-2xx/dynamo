// §11 — OG share-card generator. Renders 1200x630 PNG via Satori + resvg-wasm,
// caches to `og-images` bucket keyed by `{type}/{id}_{stamp}.png`, and 302s
// to the public URL. On miss, generates inline and uploads.
//
// GET /functions/v1/og-image?type=debate&id=<uuid>
// Supported types: debate | record | live | notebook | club | profile
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import satori from "https://esm.sh/satori@0.10.13";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const res = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
      await initWasm(await res.arrayBuffer());
    })();
  }
  return wasmReady;
}

let fontCache: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  // DM Sans 600 from Google Fonts mirror
  const res = await fetch(
    "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop3pPilOoejR.ttf",
  );
  fontCache = await res.arrayBuffer();
  return fontCache;
}

type Meta = { title: string; subtitle?: string; eyebrow?: string };

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function loadMeta(type: string, id: string): Promise<{ meta: Meta; stamp: string } | null> {
  const s = admin();
  if (type === "debate") {
    const { data } = await s.from("debates").select("title, updated_at, status").eq("id", id).maybeSingle();
    if (!data) return null;
    return { meta: { eyebrow: "DEBATE", title: data.title || "Untitled debate", subtitle: (data.status || "").toString().toUpperCase() }, stamp: data.updated_at || "" };
  }
  if (type === "record") {
    const { data } = await s.from("debates").select("title, updated_at").eq("id", id).maybeSingle();
    if (!data) return null;
    return { meta: { eyebrow: "RECORD", title: data.title || "Untitled record", subtitle: "Transcript & analysis" }, stamp: data.updated_at || "" };
  }
  if (type === "live") {
    const { data } = await s.from("live_sessions").select("title, updated_at").eq("id", id).maybeSingle();
    if (!data) return null;
    return { meta: { eyebrow: "LIVE", title: data.title || "Live session", subtitle: "Conversation in the wild" }, stamp: data.updated_at || "" };
  }
  if (type === "notebook") {
    const { data } = await s.from("session_notebooks").select("title, updated_at").eq("id", id).maybeSingle();
    if (!data) return null;
    return { meta: { eyebrow: "NOTEBOOK", title: data.title || "Untitled notebook", subtitle: "Published study" }, stamp: data.updated_at || "" };
  }
  if (type === "club") {
    const { data } = await s.from("clubs").select("name, updated_at").eq("id", id).maybeSingle();
    if (!data) return null;
    return { meta: { eyebrow: "CLUB", title: data.name || "Untitled club" }, stamp: data.updated_at || "" };
  }
  if (type === "profile") {
    const { data } = await s.from("profiles").select("display_name, username, updated_at").eq("id", id).maybeSingle();
    if (!data) return null;
    return { meta: { eyebrow: "PROFILE", title: data.display_name || data.username || "Member", subtitle: data.username ? `@${data.username}` : undefined }, stamp: data.updated_at || "" };
  }
  return null;
}

function template(meta: Meta) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "1200px",
        height: "630px",
        padding: "80px",
        background: "#ffffff",
        color: "#0a0a0a",
        fontFamily: "DM Sans",
      },
      children: [
        {
          type: "div",
          props: {
            style: { fontSize: "22px", letterSpacing: "0.25em", color: "#737373" },
            children: meta.eyebrow || "DYNAMO",
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "16px" },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "76px", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600 },
                  children: meta.title.slice(0, 120),
                },
              },
              meta.subtitle
                ? {
                    type: "div",
                    props: {
                      style: { fontSize: "28px", color: "#525252" },
                      children: meta.subtitle.slice(0, 80),
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "24px", color: "#0a0a0a" },
            children: [
              { type: "div", props: { style: { letterSpacing: "0.2em" }, children: "DYNAMO" } },
              { type: "div", props: { style: { color: "#737373" }, children: "dynamo.today" } },
            ],
          },
        },
      ],
    },
  } as any;
}

async function render(meta: Meta): Promise<Uint8Array> {
  await ensureWasm();
  const font = await loadFont();
  const svg = await satori(template(meta), {
    width: 1200,
    height: 630,
    fonts: [{ name: "DM Sans", data: font, weight: 600, style: "normal" }],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return png;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "").toLowerCase();
    const id = url.searchParams.get("id") || "";
    const force = url.searchParams.get("refresh") === "1";
    if (!type || !id) return new Response("missing type/id", { status: 400, headers: corsHeaders });

    const loaded = await loadMeta(type, id);
    if (!loaded) return new Response("not found", { status: 404, headers: corsHeaders });

    const stamp = (loaded.stamp || "v1").replace(/[^0-9a-zA-Z]/g, "").slice(0, 20) || "v1";
    const path = `${type}/${id}_${stamp}.png`;
    const s = admin();
    const publicUrl = s.storage.from("og-images").getPublicUrl(path).data.publicUrl;

    if (!force) {
      // Try HEAD on cached object; if exists, redirect.
      const head = await fetch(publicUrl, { method: "HEAD" });
      if (head.ok) {
        return Response.redirect(publicUrl, 302);
      }
    }

    const png = await render(loaded.meta);
    const { error: upErr } = await s.storage.from("og-images").upload(path, png, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "31536000",
    });
    if (upErr) console.error("[og-image] upload failed:", upErr.message);

    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    console.error("[og-image] error:", e);
    return new Response("render failed: " + (e as Error).message, { status: 500, headers: corsHeaders });
  }
});