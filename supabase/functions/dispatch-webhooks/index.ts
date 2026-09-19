import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function adminKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { const parsed = JSON.parse(raw) as Record<string,string>; if (parsed.default) return parsed.default; } catch {} }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function b64ToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function decryptSecret(payload: string) {
  const rawKey = Deno.env.get("WEBHOOK_ENCRYPTION_KEY") ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) throw new Error("Webhook encryption key is not configured.");
  const [ivRaw, tagRaw, dataRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !dataRaw) throw new Error("Invalid encrypted webhook secret.");
  const keyBytes = Uint8Array.from(rawKey.match(/.{2}/g)!.map((hex) => parseInt(hex,16)));
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const ciphertext = new Uint8Array([...b64ToBytes(dataRaw), ...b64ToBytes(tagRaw)]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(ivRaw), tagLength: 128 }, cryptoKey, ciphertext);
  return new TextDecoder().decode(plain);
}

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isSafePublicHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  const match = host.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!match) return true;
  const octets = host.split(".").map(Number);
  if (octets.some((n) => n > 255)) return false;
  const [a,b] = octets;
  if (a === 10 || a === 127 || a === 0 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168) return false;
  return !(a === 100 && b >= 64 && b <= 127);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const runnerSecret = Deno.env.get("WEBHOOK_RUNNER_SECRET") ?? "";
  if (!runnerSecret || request.headers.get("x-webhook-runner-secret") !== runnerSecret) return json({ error: "Unauthorized." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const key = adminKey();
  if (!url || !key) return json({ error: "Webhook service is not configured." }, 503);

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();
  const { data: deliveries, error } = await supabase
    .from("webhook_deliveries")
    .select("id,endpoint_id,store_id,event_type,event_id,payload,attempts")
    .eq("status","pending")
    .lte("next_attempt_at", now)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) return json({ error: "Could not load webhook queue." }, 500);

  let succeeded = 0;
  let failed = 0;

  for (const delivery of deliveries ?? []) {
    const { data: claimed } = await supabase
      .from("webhook_deliveries")
      .update({ status: "processing", attempts: delivery.attempts + 1 })
      .eq("id", delivery.id)
      .eq("status", "pending")
      .select("id,attempts")
      .maybeSingle();
    if (!claimed) continue;

    const { data: endpoint } = await supabase
      .from("webhook_endpoints")
      .select("id,url,secret_encrypted,active")
      .eq("id", delivery.endpoint_id)
      .eq("store_id", delivery.store_id)
      .maybeSingle();

    try {
      if (!endpoint?.active || !endpoint.secret_encrypted) throw new Error("Webhook endpoint is inactive or missing signing secret.");
      const target = new URL(endpoint.url);
      if (target.protocol !== "https:" || !isSafePublicHostname(target.hostname)) throw new Error("Webhook target is not allowed.");
      const secret = await decryptSecret(endpoint.secret_encrypted);
      const body = JSON.stringify(delivery.payload);
      const signature = await hmac(secret, body);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      let response: Response;
      try {
        response = await fetch(endpoint.url, {
          method: "POST",
          headers: { "content-type": "application/json", "user-agent": "E-Commerce-Premium-Webhook/1.0", "x-ecommerce-event": delivery.event_type, "x-ecommerce-delivery": delivery.id, "x-ecommerce-signature": "sha256=" + signature },
          body,
          redirect: "manual",
          signal: controller.signal,
        });
      } finally { clearTimeout(timeout); }

      if (!response.ok) throw new Error("Webhook returned HTTP " + response.status);
      await supabase.from("webhook_deliveries").update({ status: "succeeded", response_status: response.status, last_error: null }).eq("id", delivery.id);
      await supabase.from("webhook_endpoints").update({ last_delivery_at: new Date().toISOString() }).eq("id", endpoint.id);
      succeeded++;
    } catch (error) {
      const attempts = claimed.attempts;
      const finalFailure = attempts >= 6;
      const delayMs = Math.min(60 * 60 * 1000, 30_000 * Math.pow(2, Math.max(0, attempts - 1)));
      await supabase.from("webhook_deliveries").update({
        status: finalFailure ? "failed" : "pending",
        next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
        last_error: error instanceof Error ? error.message.slice(0, 1000) : "Delivery failed",
      }).eq("id", delivery.id);
      failed++;
    }
  }

  return json({ processed: (deliveries ?? []).length, succeeded, failed });
});