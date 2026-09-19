import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PLATFORM_DOMAIN = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "ecommercepremium.com").toLowerCase();
const ROOT_HOSTS = new Set([PLATFORM_DOMAIN, `www.${PLATFORM_DOMAIN}`, "localhost", "127.0.0.1"]);

function resolveStoreSlug(host: string) {
  const clean = host.split(":")[0].toLowerCase();
  if (ROOT_HOSTS.has(clean)) return null;

  const suffix = `.${PLATFORM_DOMAIN}`;
  if (!clean.endsWith(suffix)) return null;

  const slug = clean.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return null;
  return slug;
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const slug = resolveStoreSlug(request.headers.get("host") ?? "");

  if (
    !slug ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return sessionResponse;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/store/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { headers: sessionResponse.headers });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
