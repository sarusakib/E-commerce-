import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { createPublicClient } from "@/lib/supabase/public";

const PLATFORM_DOMAIN = (
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "ecommerce-premium.vercel.app"
).toLowerCase();

const ROOT_HOSTS = new Set([
  PLATFORM_DOMAIN,
  "www." + PLATFORM_DOMAIN,
  "localhost",
  "127.0.0.1",
]);

function resolveStoreSlug(host: string) {
  const clean = host.split(":")[0].toLowerCase();

  if (ROOT_HOSTS.has(clean)) return null;

  if (clean.endsWith(".localhost")) {
    const slug = clean.slice(0, -".localhost".length);
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : null;
  }

  const suffix = "." + PLATFORM_DOMAIN;
  if (!clean.endsWith(suffix)) return null;

  const slug = clean.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return null;

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : null;
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") ?? "";
  let slug = resolveStoreSlug(host);

  if (!slug) {
    const cleanHost = host.split(":")[0].toLowerCase();
    if (
      cleanHost &&
      cleanHost !== "localhost" &&
      cleanHost !== "127.0.0.1" &&
      !cleanHost.endsWith(".localhost")
    ) {
      try {
        const supabase = createPublicClient();
        const { data: domain } = await supabase
          .from("custom_domains")
          .select("store_id")
          .eq("hostname", cleanHost)
          .eq("status", "active")
          .maybeSingle();

        if (domain?.store_id) {
          const { data: store } = await supabase
            .from("stores")
            .select("slug")
            .eq("id", domain.store_id)
            .eq("status", "active")
            .maybeSingle();
          slug = store?.slug ?? null;
        }
      } catch {
        // A custom-domain lookup must never break the core platform host.
      }
    }
  }

  if (
    !slug ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return sessionResponse;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/store/" + slug + (pathname === "/" ? "" : pathname);

  return NextResponse.rewrite(url, { headers: sessionResponse.headers });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
