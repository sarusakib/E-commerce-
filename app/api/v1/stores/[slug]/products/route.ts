import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function bearer(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const token = bearer(request);
  if (!token) return json({ error: "Bearer API key required." }, 401);
  if (token.length > 1000) return json({ error: "Invalid API key." }, 401);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return json({ error: "API service is not configured." }, 503);
  }

  const keyHash = createHash("sha256").update(token).digest("hex");
  const { data: apiKey } = await admin
    .from("api_keys")
    .select("id,store_id,scopes,revoked_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!apiKey) return json({ error: "Invalid or revoked API key." }, 401);
  if (!apiKey.scopes.includes("products:read")) return json({ error: "API key lacks products:read scope." }, 403);

  const { slug } = await params;
  const storeSlug = slug.toLowerCase();
  const { data: store } = await admin
    .from("stores")
    .select("id,name,slug,status,default_currency,locale,timezone,country_code")
    .eq("id", apiKey.store_id)
    .eq("slug", storeSlug)
    .maybeSingle();

  if (!store || store.status !== "active") return json({ error: "Store not found." }, 404);

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const { data: products, error } = await admin
    .from("products")
    .select("id,name,slug,description,sku,currency,price,compare_at_price,stock,status,featured,brand,category,primary_image_url,seo_title,seo_description,created_at,updated_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return json({ error: "Products could not be loaded." }, 500);

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKey.id);

  return json({
    data: products ?? [],
    pagination: {
      limit,
      offset,
      returned: products?.length ?? 0,
      next_offset: (products?.length ?? 0) === limit ? offset + limit : null,
    },
  });
}
