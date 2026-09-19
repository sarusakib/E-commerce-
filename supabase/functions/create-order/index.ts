import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const buckets = new Map<string, { started: number; count: number }>();

const platformDomain = (
  Deno.env.get("ECOMMERCE_PLATFORM_DOMAIN") ||
  "ecommerce-premium.vercel.app"
).toLowerCase();

function adminKey() {
  const secretJson = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretJson) {
    try {
      const parsed = JSON.parse(secretJson) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy secret name.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function allowedMethodLimit(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || now - current.started > 60_000) {
    buckets.set(ip, { started: now, count: 1 });
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!adminKey()) return json({ error: 'Checkout service is not configured.' }, 503);
  if (!allowedMethodLimit(request)) return json({ error: 'Too many checkout attempts. Try again shortly.' }, 429);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    adminKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const token = url.searchParams.get('token') ?? '';
      if (!/^[a-f0-9]{48,80}$/i.test(token)) return json({ found: false }, 400);

      const { data, error } = await supabase.rpc('get_guest_order', {
        p_confirmation_token: token,
      });
      if (error) throw error;
      return json(data ?? { found: false });
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > 65_536) return json({ error: 'Checkout request is too large.' }, 413);

    const body = await request.json() as Record<string, unknown>;
    const storeSlug = typeof body.store_slug === 'string' ? body.store_slug.trim().toLowerCase() : '';
    const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
    const customer = body.customer && typeof body.customer === 'object' ? body.customer : null;
    const items = Array.isArray(body.items) ? body.items : null;
    const shipping = body.shipping_address && typeof body.shipping_address === 'object' ? body.shipping_address : null;
    const billing = body.billing_address && typeof body.billing_address === 'object' ? body.billing_address : {};

    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(storeSlug)) return json({ error: 'Invalid store.' }, 400);

    const origin = request.headers.get('origin');
    const allowedOrigins = new Set([
      "https://" + storeSlug + "." + platformDomain,
      "https://" + platformDomain,
      "http://localhost:3000",
      "http://" + storeSlug + ".localhost:3000",
    ]);
    if (origin && !allowedOrigins.has(origin)) return json({ error: 'Invalid checkout origin.' }, 403);
    if (!origin) return json({ error: 'Checkout origin required.' }, 403);
    if (!/^[A-Za-z0-9_-]{16,120}$/.test(idempotencyKey)) return json({ error: 'Invalid checkout request.' }, 400);
    if (!customer || !items || items.length < 1 || items.length > 50 || !shipping) return json({ error: 'Incomplete checkout data.' }, 400);

    const sanitizedItems = items.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('Invalid item');
      const row = item as Record<string, unknown>;
      return {
        product_id: typeof row.product_id === 'string' ? row.product_id : '',
        variant_id: typeof row.variant_id === 'string' ? row.variant_id : null,
        quantity: Number(row.quantity),
      };
    });

    if (sanitizedItems.some((item) =>
      !/^[0-9a-f-]{36}$/i.test(item.product_id) ||
      (item.variant_id !== null && !/^[0-9a-f-]{36}$/i.test(item.variant_id)) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000
    )) return json({ error: 'Invalid cart item.' }, 400);

    const { data, error } = await supabase.rpc('create_guest_order', {
      p_store_slug: storeSlug,
      p_idempotency_key: idempotencyKey,
      p_customer: customer,
      p_items: sanitizedItems,
      p_shipping_address: shipping,
      p_billing_address: billing,
    });

    if (error) throw error;
    return json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const safe = message.includes('available') || message.includes('stock') || message.includes('quantity') || message.includes('currency')
      ? message
      : 'Checkout could not be completed. Please review your information and try again.';
    return json({ error: safe }, 400);
  }
});