import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedEvents = new Set(["product_view","add_to_cart","checkout_started","purchase","search","wishlist_add","review_view"]);
const buckets = new Map<string, { started: number; count: number }>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function allowed(ip: string) {
  const now = Date.now();
  const state = buckets.get(ip);
  if (!state || now - state.started > 60_000) { buckets.set(ip, { started: now, count: 1 }); return true; }
  if (state.count >= 60) return false;
  state.count += 1;
  return true;
}

function secret() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try { const parsed = JSON.parse(raw) as Record<string,string>; if (parsed.default) return parsed.default; } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowed(ip)) return json({ error: "Too many events." }, 429);

  const url = Deno.env.get("SUPABASE_URL");
  const key = secret();
  if (!url || !key) return json({ error: "Analytics service is not configured." }, 503);

  try {
    const body = await request.json() as Record<string, unknown>;
    const storeSlug = typeof body.store_slug === "string" ? body.store_slug.trim().toLowerCase() : "";
    const eventName = typeof body.event_name === "string" ? body.event_name.trim() : "";
    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const path = typeof body.path === "string" ? body.path.slice(0, 500) : "";
    const productId = typeof body.product_id === "string" ? body.product_id : null;
    const orderId = typeof body.order_id === "string" ? body.order_id : null;
    const value = typeof body.value === "number" && Number.isFinite(body.value) ? body.value : null;
    const currency = typeof body.currency === "string" ? body.currency.slice(0, 3).toUpperCase() : null;
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(storeSlug)) return json({ error: "Invalid store." }, 400);
    if (!allowedEvents.has(eventName)) return json({ error: "Unsupported analytics event." }, 400);
    if (!/^[a-zA-Z0-9_-]{16,120}$/.test(sessionId)) return json({ error: "Invalid session." }, 400);
    if (metadata && JSON.stringify(metadata).length > 3000) return json({ error: "Analytics metadata is too large." }, 413);

    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: store } = await supabase.from("stores").select("id,status,default_currency").eq("slug", storeSlug).eq("status","active").maybeSingle();
    if (!store) return json({ error: "Store not found." }, 404);

    const { error } = await supabase.from("analytics_events").insert({
      store_id: store.id,
      session_id: sessionId,
      event_name: eventName,
      path,
      product_id: productId,
      order_id: orderId,
      value,
      currency: currency || store.default_currency,
      metadata,
    });
    if (error) throw error;

    return json({ ok: true });
  } catch {
    return json({ error: "Analytics event was not accepted." }, 400);
  }
});