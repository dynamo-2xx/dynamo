// deno-lint-ignore-file no-explicit-any
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:notifications@dynamo.today";

// ---------- Web Push (VAPID + AES-128-GCM, RFC 8291) ----------
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function importEcdsaPrivateKey(d: string): Promise<CryptoKey> {
  // Re-derive the public key from VAPID public so we can build a JWK
  const pubRaw = b64urlToBytes(VAPID_PUBLIC); // 0x04 || x || y
  const x = bytesToB64url(pubRaw.slice(1, 33));
  const y = bytesToB64url(pubRaw.slice(33, 65));
  const jwk = { kty: "EC", crv: "P-256", d, x, y, ext: true };
  return await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function vapidJwt(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT };
  const enc = (o: any) => bytesToB64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const key = await importEcdsaPrivateKey(VAPID_PRIVATE);
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput)),
  );
  return `${signingInput}.${bytesToB64url(sig)}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function encryptPushPayload(
  payload: string,
  p256dhB64: string,
  authB64: string,
): Promise<Uint8Array> {
  // RFC 8291 aes128gcm encoding
  const recipientPubRaw = b64urlToBytes(p256dhB64); // 65 bytes uncompressed
  const recipientPubJwk = {
    kty: "EC", crv: "P-256",
    x: bytesToB64url(recipientPubRaw.slice(1, 33)),
    y: bytesToB64url(recipientPubRaw.slice(33, 65)),
    ext: true,
  };
  const recipientPub = await crypto.subtle.importKey(
    "jwk", recipientPubJwk, { name: "ECDH", namedCurve: "P-256" }, false, [],
  );
  // Ephemeral sender keypair
  const sender = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"],
  );
  const senderPubJwk = await crypto.subtle.exportKey("jwk", sender.publicKey);
  const senderPubRaw = concat(
    new Uint8Array([0x04]),
    b64urlToBytes(senderPubJwk.x as string),
    b64urlToBytes(senderPubJwk.y as string),
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: recipientPub }, sender.privateKey, 256,
    ),
  );

  const auth = b64urlToBytes(authB64);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK_key = HKDF(auth, sharedSecret, "WebPush: info\0" || ua_pub || as_pub, 32)
  const keyInfo = concat(
    new TextEncoder().encode("WebPush: info\0"),
    recipientPubRaw,
    senderPubRaw,
  );
  const ikm = await hkdf(auth, sharedSecret, keyInfo, 32);

  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  // NONCE = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  // Pad: payload || 0x02 (single record)
  const plaintext = concat(new TextEncoder().encode(payload), new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext),
  );

  // Header: salt(16) || rs(4 BE = 4096) || idlen(1) || keyid(senderPubRaw, 65)
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]);
  const idlen = new Uint8Array([senderPubRaw.length]);
  return concat(salt, rs, idlen, senderPubRaw, ciphertext);
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<number> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await vapidJwt(audience);
  const body = await encryptPushPayload(payload, sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Authorization": `vapid t=${jwt}, k=${VAPID_PUBLIC}`,
    },
    body,
  });
  return res.status;
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { debate_id } = await req.json();
    if (!debate_id) {
      return new Response(JSON.stringify({ error: "debate_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: debate } = await admin
      .from("debates")
      .select("id, topic, created_by")
      .eq("id", debate_id)
      .maybeSingle();
    if (!debate) {
      return new Response(JSON.stringify({ error: "debate not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect notify subscribers (creator + everyone who opted in)
    const recipientSet = new Set<string>();
    const { data: subs } = await admin
      .from("debate_notify_subscriptions")
      .select("user_id")
      .eq("debate_id", debate_id);
    for (const s of subs ?? []) recipientSet.add(s.user_id as string);

    if (recipientSet.size === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Insert in-app notifications
    const inAppRows = Array.from(recipientSet).map((uid) => ({
      recipient_id: uid,
      actor_id: debate.created_by,
      debate_id: debate.id,
      type: "debate_started",
      title: "A debate you follow is live",
      body: debate.topic,
      metadata: { debate_id: debate.id },
    }));
    await admin.from("notifications").insert(inAppRows);

    // 2) Browser push to each user's devices
    let sent = 0;
    let failed = 0;
    if (VAPID_PRIVATE && VAPID_PUBLIC) {
      const userIds = Array.from(recipientSet);
      const { data: pushSubs } = await admin
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth")
        .in("user_id", userIds);

      const payload = JSON.stringify({
        title: "Live now: " + (debate.topic ?? "Debate"),
        body: "Tap to join the room.",
        url: `/debate/${debate.id}`,
        debate_id: debate.id,
      });

      for (const s of pushSubs ?? []) {
        try {
          const status = await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          } else if (status >= 200 && status < 300) {
            sent++;
          } else {
            failed++;
          }
        } catch (_e) {
          failed++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, recipients: recipientSet.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});